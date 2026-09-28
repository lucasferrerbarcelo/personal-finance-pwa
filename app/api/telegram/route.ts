import { NextRequest, NextResponse } from 'next/server';
import { parseTelegramMessage } from '@/lib/telegram/parser';
import {
  sendTelegramMessage,
  editTelegramMessageText,
  answerTelegramCallbackQuery,
  getTelegramFile,
  downloadTelegramFile,
} from '@/lib/telegram/bot';
import { getServiceSupabase } from '@/lib/supabase/server';
import { calculateInstallmentDates, formatCurrency, getCurrentDateISO } from '@/lib/utils';
import { PaymentMethod } from '@/lib/supabase/types';
import { INITIAL_CATEGORIES } from '@/lib/mockData';
import { findBestCategory } from '@/lib/categories/matcher';
import { processVoiceNoteWithGemini } from '@/lib/gemini/voice';

export const dynamic = 'force-dynamic';

const PAYMENT_METHOD_LABELS: Record<string, string> = {
  efectivo: '💵 Efectivo',
  tarjeta_credito: '💳 Tarjeta de Crédito',
  tarjeta_debito: '💳 Tarjeta de Débito',
  transferencia: '📲 Transf / MP',
  otro: '🔄 Otro',
};

function getCategoryEmoji(name: string): string {
  const lower = name.toLowerCase();
  if (lower.includes('super')) return '🛒';
  if (lower.includes('comida') || lower.includes('salidas')) return '🍔';
  if (lower.includes('transporte') || lower.includes('combustible')) return '🚗';
  if (lower.includes('servicio') || lower.includes('impuesto')) return '🧾';
  if (lower.includes('salud') || lower.includes('farmacia')) return '💊';
  if (lower.includes('indumentaria') || lower.includes('ropa')) return '👕';
  if (lower.includes('tecnología') || lower.includes('gadget')) return '💻';
  if (lower.includes('entretenimiento')) return '🍿';
  if (lower.includes('educación')) return '🎓';
  return '📦';
}

function getMainTransactionKeyboard(txId: string) {
  return {
    inline_keyboard: [
      [
        { text: '💵 Efectivo', callback_data: `pay_${txId}_efectivo` },
        { text: '💳 Débito', callback_data: `pay_${txId}_tarjeta_debito` },
      ],
      [
        { text: '💳 Crédito', callback_data: `pay_${txId}_tarjeta_credito` },
        { text: '📲 Transf / MP', callback_data: `pay_${txId}_transferencia` },
      ],
      [
        { text: '🏷 Cambiar categoría', callback_data: `cat_menu_${txId}` },
        { text: '↩️ Deshacer', callback_data: `undo_${txId}` },
      ],
    ],
  };
}

function getCategoriesKeyboard(txId: string, categories: Array<{ id: string; name: string }>) {
  const keyboard: Array<Array<{ text: string; callback_data: string }>> = [];
  const chunkSize = 2;

  for (let i = 0; i < categories.length; i += chunkSize) {
    const row = categories.slice(i, i + chunkSize).map(c => ({
      text: `${getCategoryEmoji(c.name)} ${c.name}`,
      callback_data: `sc_${txId}_${c.id.slice(0, 8)}`,
    }));
    keyboard.push(row);
  }

  // Back button
  keyboard.push([
    { text: '⬅️ Volver a métodos', callback_data: `pay_menu_${txId}` },
  ]);

  return { inline_keyboard: keyboard };
}

function formatExpenseMessage(params: {
  amount: number;
  currency: 'ARS' | 'USD';
  concept: string;
  categoryName: string;
  methodLabel: string;
  installments?: number;
  perInstallment?: number;
  dates?: string[];
}) {
  const { amount, currency, concept, categoryName, methodLabel, installments, perInstallment, dates } = params;

  if (installments && installments > 1 && perInstallment && dates) {
    return (
      `✅ *Gasto en Cuotas Registrado*\n\n` +
      `💸 *Total:* ${formatCurrency(amount, currency)} (${installments} cuotas de ${formatCurrency(perInstallment, currency)})\n` +
      `📝 *Concepto:* ${concept}\n` +
      `📂 *Categoría:* ${categoryName}\n` +
      `💳 *Método:* ${methodLabel}\n` +
      `📅 *Meses:* desde ${dates[0]} hasta ${dates[dates.length - 1]}`
    );
  }

  return (
    `✅ *Gasto registrado:*\n\n` +
    `💸 *Monto:* ${formatCurrency(amount, currency)}\n` +
    `📝 *Concepto:* ${concept}\n` +
    `📂 *Categoría:* ${categoryName}\n` +
    `💳 *Método:* ${methodLabel}`
  );
}

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

    // -------------------------------------------------------------
    // 1. Handle Callback Queries (Interactive Inline Buttons)
    // -------------------------------------------------------------
    if (update.callback_query) {
      const cb = update.callback_query;
      const callbackId = cb.id;
      const data = (cb.data || '') as string;
      const chatId = cb.message?.chat?.id;
      const messageId = cb.message?.message_id;
      const fromId = cb.from?.id;

      const allowedChatId = process.env.TELEGRAM_MY_CHAT_ID;
      if (allowedChatId && String(fromId) !== String(allowedChatId)) {
        await answerTelegramCallbackQuery(callbackId, '⛔ Acceso denegado', true);
        return NextResponse.json({ ok: true, error: 'Unauthorized' }, { status: 403 });
      }

      const supabase = getServiceSupabase();
      if (!supabase) {
        await answerTelegramCallbackQuery(callbackId, '⚠️ Base de datos no disponible');
        return NextResponse.json({ ok: true });
      }

      // 1.1 Undo transaction: undo_<ID>
      const undoMatch = data.match(/^undo_(.+)$/);
      if (undoMatch) {
        const txId = undoMatch[1];
        const { data: tx } = await supabase
          .from('transactions')
          .select('*')
          .eq('id', txId)
          .single();

        if (!tx) {
          await answerTelegramCallbackQuery(callbackId, 'El movimiento ya fue eliminado.');
          if (chatId && messageId) {
            await editTelegramMessageText(chatId, messageId, '🗑 *Este movimiento ya fue eliminado.*');
          }
          return NextResponse.json({ ok: true });
        }

        const amountFormatted = formatCurrency(Number(tx.amount), tx.currency);
        const concept = tx.note || 'Gasto';

        // Delete either by parent_transaction_id (if installments) or by id
        if (tx.parent_transaction_id) {
          await supabase.from('transactions').delete().eq('parent_transaction_id', tx.parent_transaction_id);
        } else {
          await supabase.from('transactions').delete().or(`id.eq.${txId},parent_transaction_id.eq.${txId}`);
        }

        await answerTelegramCallbackQuery(callbackId, 'Gasto eliminado');
        if (chatId && messageId) {
          await editTelegramMessageText(
            chatId,
            messageId,
            `🗑 *Gasto de ${amountFormatted} eliminado correctamente.* (${concept})`,
            { replyMarkup: { inline_keyboard: [] } }
          );
        }
        return NextResponse.json({ ok: true });
      }

      // 1.2 Open Category Menu: cat_menu_<ID>
      const catMenuMatch = data.match(/^cat_menu_(.+)$/);
      if (catMenuMatch) {
        const txId = catMenuMatch[1];
        const { data: dbCategories } = await supabase.from('categories').select('*').eq('type', 'expense');
        const categoriesList = (dbCategories && dbCategories.length > 0
          ? dbCategories
          : INITIAL_CATEGORIES.filter(c => c.type === 'expense')) as Array<{ id: string; name: string }>;

        await answerTelegramCallbackQuery(callbackId);
        if (chatId && messageId) {
          await editTelegramMessageText(
            chatId,
            messageId,
            cb.message?.text || 'Elegí la categoría para este gasto:',
            { replyMarkup: getCategoriesKeyboard(txId, categoriesList) }
          );
        }
        return NextResponse.json({ ok: true });
      }

      // 1.3 Back to Payment Menu: pay_menu_<ID>
      const payMenuMatch = data.match(/^pay_menu_(.+)$/);
      if (payMenuMatch) {
        const txId = payMenuMatch[1];
        await answerTelegramCallbackQuery(callbackId);
        if (chatId && messageId) {
          await editTelegramMessageText(
            chatId,
            messageId,
            cb.message?.text || 'Gasto registrado:',
            { replyMarkup: getMainTransactionKeyboard(txId) }
          );
        }
        return NextResponse.json({ ok: true });
      }

      // 1.4 Select Category: sc_<ID>_<SHORT_CAT_ID>
      const setCatMatch = data.match(/^sc_(.+)_(.+)$/);
      if (setCatMatch) {
        const txId = setCatMatch[1];
        const shortCatId = setCatMatch[2];

        const { data: dbCategories } = await supabase.from('categories').select('*').eq('type', 'expense');
        const categoriesList = (dbCategories && dbCategories.length > 0
          ? dbCategories
          : INITIAL_CATEGORIES.filter(c => c.type === 'expense')) as Array<{ id: string; name: string }>;

        const targetCat = categoriesList.find(c => c.id.startsWith(shortCatId));

        if (targetCat) {
          // Update transaction
          await supabase.from('transactions').update({ category_id: targetCat.id } as any).eq('id', txId);
          await supabase.from('transactions').update({ category_id: targetCat.id } as any).eq('parent_transaction_id', txId);

          const { data: tx } = await supabase
            .from('transactions')
            .select('*, category:categories(*)')
            .eq('id', txId)
            .single();

          const method = (tx?.payment_method || 'transferencia') as PaymentMethod;
          const methodLabel = PAYMENT_METHOD_LABELS[method] || method;

          await answerTelegramCallbackQuery(callbackId, `Categoría: ${targetCat.name}`);

          if (chatId && messageId && tx) {
            const updatedText = formatExpenseMessage({
              amount: Number(tx.amount),
              currency: tx.currency,
              concept: tx.note || 'Gasto',
              categoryName: targetCat.name,
              methodLabel,
            });

            await editTelegramMessageText(chatId, messageId, updatedText, {
              replyMarkup: getMainTransactionKeyboard(txId),
            });
          }
        } else {
          await answerTelegramCallbackQuery(callbackId, 'Categoría no encontrada');
        }

        return NextResponse.json({ ok: true });
      }

      // 1.5 Change payment method: pay_<ID>_<METODO>
      const payMatch = data.match(/^pay_(.+)_(efectivo|tarjeta_debito|tarjeta_credito|transferencia|otro)$/);
      if (payMatch) {
        const txId = payMatch[1];
        const newMethod = payMatch[2] as PaymentMethod;

        const { data: tx } = await supabase
          .from('transactions')
          .select('*, category:categories(*)')
          .eq('id', txId)
          .single();

        if (!tx) {
          await answerTelegramCallbackQuery(callbackId, 'No se encontró la transacción');
          return NextResponse.json({ ok: true });
        }

        // Update transaction and any related installment rows
        await supabase.from('transactions').update({ payment_method: newMethod } as any).eq('id', txId);
        if (tx.parent_transaction_id) {
          await supabase
            .from('transactions')
            .update({ payment_method: newMethod } as any)
            .eq('parent_transaction_id', tx.parent_transaction_id);
        } else {
          await supabase
            .from('transactions')
            .update({ payment_method: newMethod } as any)
            .eq('parent_transaction_id', txId);
        }

        const methodLabel = PAYMENT_METHOD_LABELS[newMethod] || newMethod;
        const catName = tx.category?.name || 'General';

        await answerTelegramCallbackQuery(callbackId, `Método: ${methodLabel}`);

        if (chatId && messageId) {
          const updatedText = formatExpenseMessage({
            amount: Number(tx.amount),
            currency: tx.currency,
            concept: tx.note || 'Gasto',
            categoryName: catName,
            methodLabel,
          });

          await editTelegramMessageText(chatId, messageId, updatedText, {
            replyMarkup: getMainTransactionKeyboard(txId),
          });
        }

        return NextResponse.json({ ok: true });
      }

      // Fallback response for callback
      await answerTelegramCallbackQuery(callbackId);
      return NextResponse.json({ ok: true });
    }

    // -------------------------------------------------------------
    // 2. Handle Messages (Voice or Text)
    // -------------------------------------------------------------
    const message = update.message || update.edited_message;
    if (!message) {
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

    const supabase = getServiceSupabase();
    const today = getCurrentDateISO();

    // Fetch existing categories from Supabase (or fallback)
    let categoriesList: Array<{ id: string; name: string }> = INITIAL_CATEGORIES.filter(c => c.type === 'expense');
    if (supabase) {
      const { data: dbCats } = await supabase.from('categories').select('*').eq('type', 'expense');
      if (dbCats && dbCats.length > 0) {
        categoriesList = dbCats as Array<{ id: string; name: string }>;
      }
    }

    // -------------------------------------------------------------
    // 2.1 Voice Note to Expense (Voice-to-Expense)
    // -------------------------------------------------------------
    const voice = message.voice || message.audio;
    if (voice) {
      try {
        const fileInfo = await getTelegramFile(voice.file_id);
        if (!fileInfo) {
          await sendTelegramMessage(chatId, '⚠️ No se pudo obtener el archivo de audio de Telegram.');
          return NextResponse.json({ ok: true });
        }

        const audioBuffer = await downloadTelegramFile(fileInfo.filePath);
        if (!audioBuffer) {
          await sendTelegramMessage(chatId, '⚠️ No se pudo descargar la nota de voz.');
          return NextResponse.json({ ok: true });
        }

        let parsedVoice;
        try {
          parsedVoice = await processVoiceNoteWithGemini(
            audioBuffer,
            voice.mime_type || 'audio/ogg',
            categoriesList
          );
        } catch (err: any) {
          if (err.message === 'GEMINI_API_KEY_NOT_CONFIGURED') {
            await sendTelegramMessage(
              chatId,
              '🎙 *Recibí tu nota de voz*, pero falta configurar la variable `GEMINI_API_KEY` en tu `.env.local` o variables de entorno de Vercel para procesar audios con IA.'
            );
            return NextResponse.json({ ok: true });
          }
          console.error('[Gemini Voice Error]:', err);
          await sendTelegramMessage(
            chatId,
            `⚠️ Error al procesar audio con Gemini: ${err.message || 'Error desconocido'}`
          );
          return NextResponse.json({ ok: true });
        }

        if (!parsedVoice || parsedVoice.amount <= 0) {
          await sendTelegramMessage(
            chatId,
            `🤔 No pude identificar un monto en el audio. Por favor intentá diciendo claramente el monto y concepto (ej: *"Gasté 3500 en café con medialunas en efectivo"*).`
          );
          return NextResponse.json({ ok: true });
        }

        const { amount, currency, concept, payment_method, category_id, category_name, installments } = parsedVoice;
        const perInstallment = Number((amount / installments).toFixed(2));
        const dates = calculateInstallmentDates(today, installments);

        const parentId = crypto.randomUUID();
        const singleTxId = crypto.randomUUID();
        const primaryId = installments > 1 ? parentId : singleTxId;

        if (supabase) {
          const recordsToInsert = [];
          for (let i = 0; i < installments; i++) {
            const installmentNote = installments > 1 ? `${concept} (Cuota ${i + 1}/${installments})` : concept;
            recordsToInsert.push({
              id: installments > 1 ? (i === 0 ? parentId : crypto.randomUUID()) : singleTxId,
              type: 'expense' as const,
              amount: perInstallment,
              currency,
              category_id,
              date: dates[i],
              note: installmentNote,
              payment_method,
              installment_current: installments > 1 ? i + 1 : null,
              installment_total: installments > 1 ? installments : null,
              parent_transaction_id: installments > 1 ? parentId : null,
            });
          }

          const { error: insErr } = await supabase.from('transactions').insert(recordsToInsert as any);
          if (insErr) {
            console.error('[Telegram Webhook] Error inserting voice transaction:', insErr);
            await sendTelegramMessage(chatId, `⚠️ Error al guardar en base de datos: ${insErr.message}`);
            return NextResponse.json({ ok: true });
          }
        }

        const methodLabel = PAYMENT_METHOD_LABELS[payment_method] || '📲 Transf / MP';
        const catName = category_name || 'General';

        const reply = formatExpenseMessage({
          amount,
          currency,
          concept,
          categoryName: catName,
          methodLabel,
          installments,
          perInstallment,
          dates,
        });

        await sendTelegramMessage(chatId, reply, {
          replyMarkup: getMainTransactionKeyboard(primaryId),
        });

        return NextResponse.json({ ok: true });
      } catch (voiceErr: any) {
        console.error('[Telegram Voice Handler Global Error]:', voiceErr);
        await sendTelegramMessage(chatId, `⚠️ Error al procesar audio: ${voiceErr.message || 'Error desconocido'}`);
        return NextResponse.json({ ok: true });
      }
    }

    // -------------------------------------------------------------
    // 2.2 Text Message Handling
    // -------------------------------------------------------------
    const text = message.text;
    if (!text) {
      return NextResponse.json({ ok: true });
    }

    const command = parseTelegramMessage(text);

    switch (command.type) {
      case 'HELP': {
        const helpMessage = `💡 *Comandos disponibles de Gastos y Finanzas:*\n\n` +
          `• 🎙 *Notas de voz:* Mandá un audio diciendo tu gasto (ej: _"Gasté 4500 en el súper en efectivo"_)\n` +
          `• \`3500 cafe\` 👉 Registra gasto con botones interactivos\n` +
          `• \`3500 cafe efectivo\` 👉 Registra gasto directamente en efectivo\n` +
          `• \`12000 nafta debito\` 👉 Registra gasto con tarjeta de débito\n` +
          `• \`60000 zapatillas 3 cuotas credito\` 👉 Compra en cuotas con tarjeta de crédito\n` +
          `• \`25 usd hosting\` 👉 Registra gasto en USD\n` +
          `• \`debo 50000 mecanico\` 👉 Registra deuda que vos debés\n` +
          `• \`me debe 20000 juan\` 👉 Registra dinero que te deben\n` +
          `• \`pago 10000 deuda juan\` 👉 Registra pago y te dice cuánto resta\n` +
          `• \`/deudas\` 👉 Muestra el estado de todas tus deudas activas\n` +
          `• \`/resumen\` 👉 Muestra el total gastado en el mes (ARS y USD)`;
        await sendTelegramMessage(chatId, helpMessage);
        break;
      }

      case 'EXPENSE': {
        const { amount, currency, note, installments, paymentMethod } = command;
        const perInstallment = Number((amount / installments).toFixed(2));
        const dates = calculateInstallmentDates(today, installments);

        const methodLabel = PAYMENT_METHOD_LABELS[paymentMethod] || '📲 Transf / MP';

        // Intelligent category assignment
        const matchedCategory = findBestCategory(note, categoriesList);
        const categoryId = matchedCategory?.id || null;
        const categoryName = matchedCategory?.name || 'General';

        const parentId = crypto.randomUUID();
        const singleTxId = crypto.randomUUID();
        const primaryId = installments > 1 ? parentId : singleTxId;

        if (supabase) {
          const recordsToInsert = [];
          for (let i = 0; i < installments; i++) {
            const installmentNote = installments > 1 ? `${note} (Cuota ${i + 1}/${installments})` : note;
            recordsToInsert.push({
              id: installments > 1 ? (i === 0 ? parentId : crypto.randomUUID()) : singleTxId,
              type: 'expense' as const,
              amount: perInstallment,
              currency,
              category_id: categoryId,
              date: dates[i],
              note: installmentNote,
              payment_method: paymentMethod,
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

        const reply = formatExpenseMessage({
          amount,
          currency,
          concept: note,
          categoryName,
          methodLabel,
          installments,
          perInstallment,
          dates,
        });

        // Interactive Keyboard with Payment methods, Category selector, and Undo
        await sendTelegramMessage(chatId, reply, {
          replyMarkup: getMainTransactionKeyboard(primaryId),
        });
        break;
      }

      case 'DEBTS_SUMMARY': {
        if (!supabase) {
          await sendTelegramMessage(chatId, '⚠️ Base de datos no disponible.');
          break;
        }

        // Query active debts: try v_debts_summary first, then fallback to debts + debt_payments
        let activeDebts: any[] = [];
        const { data: viewData, error: viewError } = await supabase
          .from('v_debts_summary')
          .select('*')
          .eq('status', 'active');

        if (!viewError && viewData) {
          activeDebts = viewData;
        } else {
          const { data: tableData } = await supabase
            .from('debts')
            .select('*, debt_payments(amount)')
            .eq('status', 'active');

          if (tableData) {
            activeDebts = tableData.map((d: any) => {
              const paid = (d.debt_payments as any[])?.reduce((sum, p) => sum + (Number(p.amount) || 0), 0) || 0;
              return {
                ...d,
                total_paid: paid,
                remaining_amount: Math.max(0, Number(d.total_amount) - paid),
              };
            });
          }
        }

        if (activeDebts.length === 0) {
          await sendTelegramMessage(chatId, '🎉 *¡No tenés deudas activas pendientes!*');
          break;
        }

        const owedList = activeDebts.filter(d => d.type === 'owed'); // Te deben
        const oweList = activeDebts.filter(d => d.type === 'owe');   // Debés

        let totalTeDebenArs = 0;
        let totalTeDebenUsd = 0;
        let totalDebesArs = 0;
        let totalDebesUsd = 0;

        for (const d of owedList) {
          const rem = Number(d.remaining_amount);
          if (d.currency === 'USD') totalTeDebenUsd += rem;
          else totalTeDebenArs += rem;
        }

        for (const d of oweList) {
          const rem = Number(d.remaining_amount);
          if (d.currency === 'USD') totalDebesUsd += rem;
          else totalDebesArs += rem;
        }

        const netArs = totalTeDebenArs - totalDebesArs;
        const netUsd = totalTeDebenUsd - totalDebesUsd;

        let msg = `📋 *Estado de Deudas Activas*\n\n`;

        if (owedList.length > 0) {
          msg += `🟢 *Te deben:*\n`;
          for (const d of owedList) {
            msg += `• *${d.person_name}*: ${formatCurrency(Number(d.remaining_amount), d.currency)}\n`;
          }
          msg += `\n`;
        }

        if (oweList.length > 0) {
          msg += `🔴 *Debés:*\n`;
          for (const d of oweList) {
            msg += `• *${d.person_name}*: ${formatCurrency(Number(d.remaining_amount), d.currency)}\n`;
          }
          msg += `\n`;
        }

        msg += `⚖️ *Balance Neto Pendiente:*\n`;
        msg += `• ARS: ${netArs >= 0 ? '+' : ''}${formatCurrency(netArs, 'ARS')}\n`;
        if (totalTeDebenUsd > 0 || totalDebesUsd > 0) {
          msg += `• USD: ${netUsd >= 0 ? '+' : ''}${formatCurrency(netUsd, 'USD')}\n`;
        }

        await sendTelegramMessage(chatId, msg);
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
          `• 🎙 Mandar una nota de voz diciendo tu gasto\n` +
          `• \`3500 cafe\`\n` +
          `• \`3500 cafe efectivo\`\n` +
          `• \`60000 zapatillas 3 cuotas credito\`\n` +
          `• \`debo 50000 mecanico\`\n` +
          `• \`me debe 20000 juan\`\n` +
          `• \`pago 10000 deuda juan\`\n` +
          `• \`/deudas\`\n` +
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
