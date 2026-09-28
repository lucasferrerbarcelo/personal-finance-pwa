import { NextRequest, NextResponse } from 'next/server';
import { parseTelegramMessage } from '@/lib/telegram/parser';
import { sendTelegramMessage } from '@/lib/telegram/bot';
import { getServiceSupabase } from '@/lib/supabase/server';
import { calculateInstallmentDates, formatCurrency, getCurrentDateISO } from '@/lib/utils';
import { INITIAL_CATEGORIES } from '@/lib/mockData';

export const dynamic = 'force-dynamic';

export async function GET() {
  return NextResponse.json({
    status: 'ok',
    message: 'Telegram Webhook is ready and listening',
    timestamp: new Date().toISOString(),
  });
}

export async function POST(req: NextRequest) {
  try {
    const update = await req.json();

    // Telegram webhook payload structure: message: { chat: { id: ... }, text: ... }
    const message = update.message || update.edited_message;
    if (!message || !message.text) {
      return NextResponse.json({ ok: true });
    }

    const chatId = message.chat?.id;
    const allowedChatId = process.env.TELEGRAM_MY_CHAT_ID;

    // Security check: only allow the configured chat ID
    if (allowedChatId && String(chatId) !== String(allowedChatId)) {
      console.warn(`[Telegram Webhook] Unauthorized chat ID: ${chatId}. Expected: ${allowedChatId}`);
      await sendTelegramMessage(
        chatId,
        '⛔ *Acceso denegado.* Este bot es de uso personal y privado.'
      );
      return NextResponse.json({ ok: true, error: 'Unauthorized' }, { status: 403 });
    }

    const text = message.text;
    const command = parseTelegramMessage(text);
    const supabase = getServiceSupabase();
    const today = getCurrentDateISO();

    switch (command.type) {
      case 'HELP': {
        const helpMessage = `💡 *Comandos disponibles de Gastos y Finanzas:*\n\n` +
          `• \`3500 cafe\` 👉 Registra gasto de $ 3.500 ARS\n` +
          `• \`25 usd hosting\` 👉 Registra gasto de U$S 25 USD\n` +
          `• \`60000 zapatillas 3 cuotas\` 👉 Divide $ 60.000 en 3 cuotas de $ 20.000\n` +
          `• \`debo 50000 mecanico\` 👉 Registra deuda que vos debés\n` +
          `• \`me debe 20000 juan\` 👉 Registra dinero que te deben\n` +
          `• \`pago 10000 deuda juan\` 👉 Registra pago y te dice cuánto resta\n` +
          `• \`/resumen\` 👉 Muestra el total gastado en el mes (ARS y USD)`;
        await sendTelegramMessage(chatId, helpMessage);
        break;
      }

      case 'EXPENSE': {
        const { amount, currency, note, installments } = command;
        const perInstallment = Number((amount / installments).toFixed(2));
        const dates = calculateInstallmentDates(today, installments);

        // Find best category match or default
        let categoryId: string | null = null;
        if (supabase) {
          const { data: categories } = await supabase.from('categories').select('*').eq('type', 'expense');
          const categoriesList = (categories || []) as unknown as { id: string; name: string }[];
          const lowerNote = note.toLowerCase();
          const match = categoriesList.find(c => {
            const catName = c.name.toLowerCase();
            return lowerNote.includes(catName) || catName.includes(lowerNote) ||
              (catName.includes('comida') && (lowerNote.includes('cafe') || lowerNote.includes('almuerzo') || lowerNote.includes('cena') || lowerNote.includes('bar'))) ||
              (catName.includes('supermercado') && (lowerNote.includes('coto') || lowerNote.includes('super') || lowerNote.includes('chino') || lowerNote.includes('carrefour'))) ||
              (catName.includes('tecnología') && (lowerNote.includes('hosting') || lowerNote.includes('monitor') || lowerNote.includes('apple') || lowerNote.includes('pc'))) ||
              (catName.includes('indumentaria') && (lowerNote.includes('zapatillas') || lowerNote.includes('remera') || lowerNote.includes('pantalon') || lowerNote.includes('ropa')));
          });
          if (match) categoryId = match.id;
        }

        const parentId = installments > 1 ? crypto.randomUUID() : null;

        if (supabase) {
          const recordsToInsert = [];
          for (let i = 0; i < installments; i++) {
            const installmentNote = installments > 1 ? `${note} (Cuota ${i + 1}/${installments})` : note;
            recordsToInsert.push({
              id: installments > 1 && i === 0 ? parentId! : crypto.randomUUID(),
              type: 'expense' as const,
              amount: perInstallment,
              currency,
              category_id: categoryId,
              date: dates[i],
              note: installmentNote,
              installment_current: installments > 1 ? i + 1 : null,
              installment_total: installments > 1 ? installments : null,
              parent_transaction_id: installments > 1 ? parentId : null,
            });
          }

          const { error } = await supabase.from('transactions').insert(recordsToInsert as any);
          if (error) {
            console.error('[Telegram Webhook] Error inserting transaction:', error);
            await sendTelegramMessage(chatId, `⚠️ Error al guardar en base de datos: ${error.message}`);
            break;
          }
        }

        let reply = '';
        if (installments > 1) {
          reply = `✅ *Gasto en Cuotas Registrado*\n\n` +
            `📦 *Concepto:* ${note}\n` +
            `💳 *Total:* ${formatCurrency(amount, currency)} (${installments} cuotas de ${formatCurrency(perInstallment, currency)})\n` +
            `📅 *Meses:* desde ${dates[0]} hasta ${dates[dates.length - 1]}`;
        } else {
          reply = `✅ *Gasto Registrado*\n\n` +
            `💸 *Monto:* ${formatCurrency(amount, currency)}\n` +
            `📝 *Concepto:* ${note}\n` +
            `📅 *Fecha:* ${today}`;
        }

        await sendTelegramMessage(chatId, reply);
        break;
      }

      case 'DEBT': {
        const { debtType, personName, amount, currency, note } = command;
        let createdDebtId: string | null = null;

        if (supabase) {
          const { data, error } = await supabase
            .from('debts')
            .insert({
              type: debtType,
              person_name: personName,
              total_amount: amount,
              currency,
              status: 'active',
              note: note || `Registrado vía Telegram el ${today}`,
            } as any)
            .select()
            .single();

          if (error) {
            console.error('[Telegram Webhook] Error creating debt:', error);
            await sendTelegramMessage(chatId, `⚠️ Error al guardar la deuda: ${error.message}`);
            break;
          }
          if (data) createdDebtId = (data as any).id;
        }

        const typeLabel = debtType === 'owe' ? '🚨 Debés a' : '💰 Te debe';
        const reply = `✅ *Deuda Registrada*\n\n` +
          `${typeLabel}: *${personName}*\n` +
          `💵 *Monto Total:* ${formatCurrency(amount, currency)}\n` +
          `📌 *Estado:* Activa`;

        await sendTelegramMessage(chatId, reply);
        break;
      }

      case 'PAYMENT': {
        const { personName, amount, currency } = command;
        if (!supabase) {
          await sendTelegramMessage(
            chatId,
            `✅ Pago simulado de ${formatCurrency(amount, currency || 'ARS')} a *${personName}* (Supabase no conectado aún).`
          );
          break;
        }

        // Search active debt by person name (case insensitive match)
        const { data: debts, error: debtsError } = await supabase
          .from('debts')
          .select('*, debt_payments(amount)')
          .ilike('person_name', `%${personName}%`)
          .eq('status', 'active');

        if (debtsError || !debts || debts.length === 0) {
          await sendTelegramMessage(
            chatId,
            `❓ No encontré deudas activas para "*${personName}*". Revisá el nombre o si ya fue saldada.`
          );
          break;
        }

        const targetDebt = debts[0] as any;
        const paidSoFar = (targetDebt.debt_payments as any[])?.reduce(
          (acc, p) => acc + (Number(p.amount) || 0),
          0
        ) || 0;
        const currentRemaining = Number(targetDebt.total_amount) - paidSoFar;

        // Record payment
        const { error: payError } = await supabase.from('debt_payments').insert({
          debt_id: targetDebt.id,
          amount,
          date: today,
          note: 'Registrado vía Telegram',
        } as any);

        if (payError) {
          await sendTelegramMessage(chatId, `⚠️ Error al registrar pago: ${payError.message}`);
          break;
        }

        const newRemaining = Math.max(0, currentRemaining - amount);
        const isSettled = newRemaining <= 0;

        if (isSettled) {
          await supabase.from('debts').update({ status: 'settled' } as any).eq('id', targetDebt.id);
        }

        const reply = isSettled
          ? `🎉 *¡Deuda Totalmente Saldada!*\n\n` +
            `👤 *Persona:* ${targetDebt.person_name}\n` +
            `💸 *Pago recibido/hecho:* ${formatCurrency(amount, targetDebt.currency)}\n` +
            `🏁 *Saldo restante:* $ 0 (Marcada como Saldada)`
          : `✅ *Pago Parcial Registrado*\n\n` +
            `👤 *Persona:* ${targetDebt.person_name}\n` +
            `💸 *Monto pagado:* ${formatCurrency(amount, targetDebt.currency)}\n` +
            `⏳ *Saldo restante:* ${formatCurrency(newRemaining, targetDebt.currency)}`;

        await sendTelegramMessage(chatId, reply);
        break;
      }

      case 'SUMMARY': {
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const startOfMonth = `${year}-${month}-01`;
        const endOfMonth = `${year}-${month}-31`;

        let totalArs = 0;
        let totalUsd = 0;
        let txCount = 0;

        if (supabase) {
          const { data: txs } = await supabase
            .from('transactions')
            .select('amount, currency, type')
            .gte('date', startOfMonth)
            .lte('date', endOfMonth)
            .eq('type', 'expense');

          const txList = (txs || []) as any[];
          txCount = txList.length;
          for (const tx of txList) {
            if (tx.currency === 'USD') {
              totalUsd += Number(tx.amount);
            } else {
              totalArs += Number(tx.amount);
            }
          }
        }

        const monthName = now.toLocaleDateString('es-ES', { month: 'long' });
        const capitalizedMonth = monthName.charAt(0).toUpperCase() + monthName.slice(1);

        const summaryMsg = `📊 *Resumen de Gastos - ${capitalizedMonth} ${year}*\n\n` +
          `🇦🇷 *Total en ARS:* ${formatCurrency(totalArs, 'ARS')}\n` +
          `🇺🇸 *Total en USD:* ${formatCurrency(totalUsd, 'USD')}\n` +
          `🧾 *Total movimientos del mes:* ${txCount}\n\n` +
          `💡 _Tip: Podés consultar el panel web para ver el gráfico interactivo por categoría y cuotas futuras._`;

        await sendTelegramMessage(chatId, summaryMsg);
        break;
      }

      case 'UNKNOWN':
      default: {
        await sendTelegramMessage(
          chatId,
          `🤔 No entendí el formato. Probá por ejemplo:\n` +
          `• \`3500 cafe\`\n` +
          `• \`25 usd hosting\`\n` +
          `• \`60000 zapatillas 3 cuotas\`\n` +
          `• \`debo 50000 mecanico\`\n` +
          `• \`me debe 20000 juan\`\n` +
          `• \`pago 10000 deuda juan\`\n` +
          `• \`/resumen\`\n\n` +
          `O escribí \`/ayuda\` para más detalles.`
        );
        break;
      }
    }

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error('[Telegram Webhook] Global handler error:', err);
    return NextResponse.json({ ok: false, error: err?.message || 'Server error' }, { status: 500 });
  }
}
