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
import { findBestCategory, findBestIncomeCategory } from '@/lib/categories/matcher';
import { processVoiceNoteWithGemini } from '@/lib/gemini/voice';
import { processReceiptImageWithGemini } from '@/lib/gemini/receipt';
import { getMonthlyBudget, getMonthlySpent, setMonthlyBudget } from '@/lib/budgets/service';
import {
  calculateStatementCycle,
  calculateInstallmentStatementCycles,
  StatementCycleInfo,
} from '@/lib/creditCards/calculator';
import { getDefaultCreditCard } from '@/lib/creditCards/service';

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
  if (lower.includes('sueldo')) return '💰';
  if (lower.includes('honorario')) return '💼';
  if (lower.includes('venta')) return '🏷';
  if (lower.includes('transferencia')) return '📲';
  if (lower.includes('ingreso')) return '🟢';
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

function getIncomeTransactionKeyboard(txId: string) {
  return {
    inline_keyboard: [
      [
        { text: '📲 Transferencia', callback_data: `pay_${txId}_transferencia` },
        { text: '💵 Efectivo', callback_data: `pay_${txId}_efectivo` },
      ],
      [
        { text: '💙 Mercado Pago', callback_data: `pay_${txId}_transferencia` },
        { text: '🏦 Banco', callback_data: `pay_${txId}_transferencia` },
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
  isReceipt?: boolean;
  creditCycle?: StatementCycleInfo;
  installmentCycles?: StatementCycleInfo[];
}) {
  const {
    amount,
    currency,
    concept,
    categoryName,
    methodLabel,
    installments,
    perInstallment,
    dates,
    isReceipt,
    creditCycle,
    installmentCycles,
  } = params;

  if (creditCycle) {
    if (installments && installments > 1 && perInstallment) {
      const lastCycle = installmentCycles && installmentCycles.length > 0
        ? installmentCycles[installmentCycles.length - 1]
        : null;

      return (
        `💳 *Gasto en Crédito registrado:* ${formatCurrency(amount, currency)} (${installments} cuotas de ${formatCurrency(perInstallment, currency)})\n\n` +
        `📝 *Concepto:* ${concept}\n` +
        `📂 *Categoría:* ${categoryName}\n` +
        `📅 *Entra en el resumen a pagar en:* ${creditCycle.statementMonthName} (Día ${creditCycle.dueDay})\n` +
        `🏷 *Cierre del resumen:* día ${creditCycle.closingDay} (${creditCycle.closingDisplay})` +
        (lastCycle && lastCycle.statementMonth !== creditCycle.statementMonth
          ? `\n📅 *Última cuota a pagar en:* ${lastCycle.statementMonthName} (Día ${lastCycle.dueDay})`
          : '')
      );
    }

    return (
      `💳 *Gasto en Crédito registrado:* ${formatCurrency(amount, currency)}\n\n` +
      `📝 *Concepto:* ${concept}\n` +
      `📂 *Categoría:* ${categoryName}\n` +
      `📅 *Entra en el resumen a pagar en:* ${creditCycle.statementMonthName} (Día ${creditCycle.dueDay})\n` +
      `🏷 *Cierre del resumen:* día ${creditCycle.closingDay} (${creditCycle.closingDisplay})`
    );
  }

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

  if (isReceipt) {
    return (
      `🧾 *Ticket procesado con éxito:*\n\n` +
      `💰 *Monto:* ${formatCurrency(amount, currency)}\n` +
      `🏷 *Concepto:* ${concept}\n` +
      `📂 *Categoría:* ${categoryName}\n` +
      `💳 *Método:* ${methodLabel}`
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

function formatIncomeMessage(params: {
  amount: number;
  currency: 'ARS' | 'USD';
  concept: string;
  categoryName: string;
  methodLabel: string;
  nuevoBalance: number;
}) {
  const { amount, currency, concept, categoryName, methodLabel, nuevoBalance } = params;
  return (
    `🟢 *Ingreso registrado:* +${formatCurrency(amount, currency)}\n` +
    (concept && concept !== categoryName ? `📝 *Concepto:* ${concept}\n` : '') +
    `📂 *Categoría:* ${categoryName}\n` +
    `💳 *Método:* ${methodLabel}\n` +
    `💰 *Balance total disponible:* ${formatCurrency(nuevoBalance, currency)}`
  );
}

async function getAvailableCashBalance(
  monthStr: string,
  currency: 'ARS' | 'USD',
  supabase: any
): Promise<number> {
  if (!supabase) return 0;
  try {
    const startOfMonth = `${monthStr}-01`;
    const endOfMonth = `${monthStr}-31`;
    const { data: txs } = await supabase
      .from('transactions')
      .select('amount, currency, type, payment_method')
      .gte('date', startOfMonth)
      .lte('date', endOfMonth);

    if (!txs) return 0;
    let income = 0;
    let cashExpense = 0;
    for (const t of txs) {
      const cur = t.currency || 'ARS';
      if (cur !== currency) continue;
      const amt = Number(t.amount) || 0;
      if (t.type === 'income') {
        income += amt;
      } else if (t.type === 'expense' && t.payment_method !== 'tarjeta_credito') {
        cashExpense += amt;
      }
    }
    return income - cashExpense;
  } catch (err) {
    console.warn('[Balance Calculation Error]:', err);
    return 0;
  }
}

async function getBudgetAlertFooter(
  addedAmount: number,
  currency: 'ARS' | 'USD',
  monthStr: string,
  supabase: any
): Promise<string> {
  if (!supabase || currency !== 'ARS') return '';

  try {
    const budget = await getMonthlyBudget(monthStr, 'ARS', supabase);
    if (!budget || !budget.amount || Number(budget.amount) <= 0) {
      return '';
    }

    const budgetAmount = Number(budget.amount);
    const { total: totalSpentNow } = await getMonthlySpent(monthStr, 'ARS', supabase);
    const spentBefore = Math.max(0, totalSpentNow - addedAmount);

    const pctBefore = (spentBefore / budgetAmount) * 100;
    const pctNow = (totalSpentNow / budgetAmount) * 100;
    const roundedPct = Math.round(pctNow);

    let footer = `\n\n📊 *Mes:* ${formatCurrency(totalSpentNow, 'ARS')} / ${formatCurrency(budgetAmount, 'ARS')} (${roundedPct}%)`;

    // Alert if crossed 100% or 80% with this expense
    if (pctBefore < 100 && pctNow >= 100) {
      footer += `\n🚨 *Límite mensual superado* (superaste el 100% del presupuesto)`;
    } else if (pctBefore < 80 && pctNow >= 80) {
      footer += `\n⚠️ *Atención: superaste el 80% del presupuesto*`;
    }

    return footer;
  } catch (err) {
    console.warn('[Budget Footer Error]:', err);
    return '';
  }
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
    const today = getCurrentDateISO();

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

        const isIncome = tx.type === 'income';
        const amountFormatted = formatCurrency(Number(tx.amount), tx.currency);
        const concept = tx.note || (isIncome ? 'Ingreso' : 'Gasto');

        // Delete either by parent_transaction_id (if installments) or by id
        if (tx.parent_transaction_id) {
          await supabase.from('transactions').delete().eq('parent_transaction_id', tx.parent_transaction_id);
        } else {
          await supabase.from('transactions').delete().or(`id.eq.${txId},parent_transaction_id.eq.${txId}`);
        }

        await answerTelegramCallbackQuery(callbackId, isIncome ? 'Ingreso eliminado' : 'Gasto eliminado');
        if (chatId && messageId) {
          await editTelegramMessageText(
            chatId,
            messageId,
            `🗑 *${isIncome ? 'Ingreso de +' : 'Gasto de '}${amountFormatted} eliminado correctamente.* (${concept})`,
            { replyMarkup: { inline_keyboard: [] } }
          );
        }
        return NextResponse.json({ ok: true });
      }

      // 1.1b Delete Debt Callback: del_debt_<ID>
      const delDebtMatch = data.match(/^del_debt_(.+)$/);
      if (delDebtMatch) {
        const debtId = delDebtMatch[1];
        const { data: debt } = await supabase.from('debts').select('*').eq('id', debtId).single();

        if (debt) {
          await supabase.from('debt_payments').delete().eq('debt_id', debtId);
          await supabase.from('debts').delete().eq('id', debtId);

          const roleLabel = debt.type === 'owe' ? 'Debías a' : 'Te debía';
          await answerTelegramCallbackQuery(callbackId, 'Deuda eliminada');
          if (chatId && messageId) {
            await editTelegramMessageText(
              chatId,
              messageId,
              `🗑 *Deuda eliminada correctamente:*\n• ${roleLabel}: *${debt.person_name}*\n• Monto: *${formatCurrency(Number(debt.total_amount), debt.currency)}*`,
              { replyMarkup: { inline_keyboard: [] } }
            );
          }
        } else {
          await answerTelegramCallbackQuery(callbackId, 'La deuda ya no existe');
          if (chatId && messageId) {
            await editTelegramMessageText(
              chatId,
              messageId,
              `⚠️ Esta deuda ya no existe o fue eliminada previamente.`,
              { replyMarkup: { inline_keyboard: [] } }
            );
          }
        }
        return NextResponse.json({ ok: true });
      }

      // 1.1c List active debts to delete: list_del_debts
      if (data === 'list_del_debts') {
        const { data: debts } = await supabase
          .from('debts')
          .select('*')
          .eq('status', 'active')
          .order('created_at', { ascending: false })
          .limit(8);

        await answerTelegramCallbackQuery(callbackId);
        if (chatId && messageId) {
          if (!debts || debts.length === 0) {
            await editTelegramMessageText(chatId, messageId, `🎉 No tenés deudas registradas para borrar.`);
          } else {
            const buttons = debts.map(d => [
              {
                text: `🗑 ${d.type === 'owe' ? '🔴 Debo a' : '🟢 Me debe'} ${d.person_name} (${formatCurrency(Number(d.total_amount), d.currency)})`,
                callback_data: `del_debt_${d.id}`,
              },
            ]);
            await editTelegramMessageText(
              chatId,
              messageId,
              `📋 *Elegí la deuda que querés borrar:*`,
              {
                replyMarkup: {
                  inline_keyboard: buttons,
                },
              }
            );
          }
        }
        return NextResponse.json({ ok: true });
      }

      // 1.2 Open Category Menu: cat_menu_<ID>
      const catMenuMatch = data.match(/^cat_menu_(.+)$/);
      if (catMenuMatch) {
        const txId = catMenuMatch[1];
        const { data: tx } = await supabase.from('transactions').select('type').eq('id', txId).single();
        const txType = tx?.type || 'expense';

        const { data: dbCategories } = await supabase.from('categories').select('*').eq('type', txType);
        const categoriesList = (dbCategories && dbCategories.length > 0
          ? dbCategories
          : INITIAL_CATEGORIES.filter(c => c.type === txType)) as Array<{ id: string; name: string }>;

        await answerTelegramCallbackQuery(callbackId);
        if (chatId && messageId) {
          await editTelegramMessageText(
            chatId,
            messageId,
            cb.message?.text || (txType === 'income' ? 'Elegí la categoría para este ingreso:' : 'Elegí la categoría para este gasto:'),
            { replyMarkup: getCategoriesKeyboard(txId, categoriesList) }
          );
        }
        return NextResponse.json({ ok: true });
      }

      // 1.3 Back to Payment Menu: pay_menu_<ID>
      const payMenuMatch = data.match(/^pay_menu_(.+)$/);
      if (payMenuMatch) {
        const txId = payMenuMatch[1];
        const { data: tx } = await supabase.from('transactions').select('type').eq('id', txId).single();
        const isIncome = tx?.type === 'income';

        await answerTelegramCallbackQuery(callbackId);
        if (chatId && messageId) {
          await editTelegramMessageText(
            chatId,
            messageId,
            cb.message?.text || (isIncome ? 'Ingreso registrado:' : 'Gasto registrado:'),
            { replyMarkup: isIncome ? getIncomeTransactionKeyboard(txId) : getMainTransactionKeyboard(txId) }
          );
        }
        return NextResponse.json({ ok: true });
      }

      // 1.4 Select Category: sc_<ID>_<SHORT_CAT_ID>
      const setCatMatch = data.match(/^sc_(.+)_(.+)$/);
      if (setCatMatch) {
        const txId = setCatMatch[1];
        const shortCatId = setCatMatch[2];

        const { data: txBefore } = await supabase.from('transactions').select('type').eq('id', txId).single();
        const txType = txBefore?.type || 'expense';

        const { data: dbCategories } = await supabase.from('categories').select('*').eq('type', txType);
        const categoriesList = (dbCategories && dbCategories.length > 0
          ? dbCategories
          : INITIAL_CATEGORIES.filter(c => c.type === txType)) as Array<{ id: string; name: string }>;

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
            if (tx.type === 'income') {
              const currentMonthStr = (tx.date || today).slice(0, 7);
              const nuevoBalance = await getAvailableCashBalance(currentMonthStr, tx.currency, supabase);
              const updatedText = formatIncomeMessage({
                amount: Number(tx.amount),
                currency: tx.currency,
                concept: tx.note || 'Ingreso',
                categoryName: targetCat.name,
                methodLabel,
                nuevoBalance,
              });

              await editTelegramMessageText(chatId, messageId, updatedText, {
                replyMarkup: getIncomeTransactionKeyboard(txId),
              });
            } else {
              const isReceipt = (cb.message?.text || '').includes('Ticket procesado');
              const updatedText = formatExpenseMessage({
                amount: Number(tx.amount),
                currency: tx.currency,
                concept: tx.note || 'Gasto',
                categoryName: targetCat.name,
                methodLabel,
                isReceipt,
              });

              await editTelegramMessageText(chatId, messageId, updatedText, {
                replyMarkup: getMainTransactionKeyboard(txId),
              });
            }
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

        if (tx.type === 'income') {
          await supabase.from('transactions').update({
            payment_method: newMethod,
            statement_month: null,
            credit_card_id: null,
          } as any).eq('id', txId);

          const methodLabel = PAYMENT_METHOD_LABELS[newMethod] || newMethod;
          const catName = tx.category?.name || 'Otros Ingresos';
          const currentMonthStr = (tx.date || today).slice(0, 7);
          const nuevoBalance = await getAvailableCashBalance(currentMonthStr, tx.currency, supabase);

          await answerTelegramCallbackQuery(callbackId, `Método: ${methodLabel}`);

          if (chatId && messageId) {
            const updatedText = formatIncomeMessage({
              amount: Number(tx.amount),
              currency: tx.currency,
              concept: tx.note || 'Ingreso',
              categoryName: catName,
              methodLabel,
              nuevoBalance,
            });

            await editTelegramMessageText(chatId, messageId, updatedText, {
              replyMarkup: getIncomeTransactionKeyboard(txId),
            });
          }

          return NextResponse.json({ ok: true });
        }

        let creditCycle: StatementCycleInfo | undefined;
        let installmentCycles: StatementCycleInfo[] | undefined;

        if (newMethod === 'tarjeta_credito') {
          let closing_day = 24;
          let due_day = 5;
          let cardId: string | null = null;

          if (supabase) {
            const { data: cards, error: cardErr } = await supabase
              .from('credit_cards')
              .select('id, closing_day, due_day')
              .limit(1);

            if (cardErr) {
              console.warn('[Telegram Webhook] Error fetching credit_cards in callback:', cardErr);
            }

            const card = cards?.[0];
            cardId = card ? card.id : null;
            closing_day = card?.closing_day || 24;
            due_day = card?.due_day || 5;
          }

          const totalInst = tx.total_installments || tx.installment_total || 1;
          const txDate = tx.date || today;

          installmentCycles = calculateInstallmentStatementCycles(
            txDate,
            totalInst,
            closing_day,
            due_day
          );
          creditCycle = installmentCycles[0];

          await supabase.from('transactions').update({
            payment_method: newMethod,
            statement_month: creditCycle.statementMonth,
            credit_card_id: cardId || null,
          } as any).eq('id', txId);

          if (tx.parent_transaction_id || tx.installment_total || tx.total_installments) {
            const parentId = tx.parent_transaction_id || txId;
            const { data: siblings } = await supabase
              .from('transactions')
              .select('id, installment_current, current_installment')
              .or(`id.eq.${parentId},parent_transaction_id.eq.${parentId}`)
              .order('installment_current', { ascending: true });

            if (siblings && siblings.length > 0) {
              for (const sib of siblings) {
                const currentInst = sib.current_installment || sib.installment_current || 1;
                const idx = Math.max(0, currentInst - 1);
                const sibCycle = installmentCycles[idx] || creditCycle;
                await supabase.from('transactions').update({
                  payment_method: newMethod,
                  statement_month: sibCycle.statementMonth,
                  credit_card_id: cardId || null,
                } as any).eq('id', sib.id);
              }
            }
          }
        } else {
          // Reset credit card fields
          await supabase.from('transactions').update({
            payment_method: newMethod,
            statement_month: null,
            credit_card_id: null,
          } as any).eq('id', txId);

          if (tx.parent_transaction_id) {
            await supabase
              .from('transactions')
              .update({
                payment_method: newMethod,
                statement_month: null,
                credit_card_id: null,
              } as any)
              .eq('parent_transaction_id', tx.parent_transaction_id);
          } else {
            await supabase
              .from('transactions')
              .update({
                payment_method: newMethod,
                statement_month: null,
                credit_card_id: null,
              } as any)
              .eq('parent_transaction_id', txId);
          }
        }

        const methodLabel = PAYMENT_METHOD_LABELS[newMethod] || newMethod;
        const catName = tx.category?.name || 'General';

        await answerTelegramCallbackQuery(callbackId, `Método: ${methodLabel}`);

        if (chatId && messageId) {
          const isReceipt = (cb.message?.text || '').includes('Ticket procesado');
          const totalAmount = tx.installment_total && tx.installment_total > 1
            ? Number(tx.amount) * tx.installment_total
            : Number(tx.amount);

          const updatedText = formatExpenseMessage({
            amount: totalAmount,
            currency: tx.currency,
            concept: tx.note || 'Gasto',
            categoryName: catName,
            methodLabel,
            installments: tx.installment_total || 1,
            perInstallment: Number(tx.amount),
            isReceipt,
            creditCycle,
            installmentCycles,
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

    // Fetch existing categories from Supabase (or fallback)
    let categoriesList: Array<{ id: string; name: string }> = INITIAL_CATEGORIES.filter(c => c.type === 'expense');
    let incomeCategoriesList: Array<{ id: string; name: string }> = INITIAL_CATEGORIES.filter(c => c.type === 'income');
    let allCategoriesList: Array<{ id: string; name: string }> = INITIAL_CATEGORIES;

    if (supabase) {
      const { data: dbCats } = await supabase.from('categories').select('*');
      if (dbCats && dbCats.length > 0) {
        allCategoriesList = dbCats as Array<{ id: string; name: string }>;
        categoriesList = dbCats.filter((c: any) => c.type === 'expense') as Array<{ id: string; name: string }>;
        incomeCategoriesList = dbCats.filter((c: any) => c.type === 'income') as Array<{ id: string; name: string }>;
      }
    }

    // -------------------------------------------------------------
    // 2.1 Voice Note to Expense or Income (Voice-to-Expense / Income)
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
            allCategoriesList
          );
        } catch (err: any) {
          if (err.message === 'GEMINI_API_KEY_NOT_CONFIGURED') {
            await sendTelegramMessage(
              chatId,
              '🎙 *Recibí tu nota de voz*, pero falta configurar la variable `GEMINI_API_KEY` en tu `.env.local` o variables de entorno de Vercel para procesar audios con IA.'
            );
            return NextResponse.json({ ok: true });
          }

          const errMsg = (err?.message || '').toLowerCase();
          if (
            err.message === 'GEMINI_HIGH_DEMAND' ||
            errMsg.includes('503') ||
            errMsg.includes('high demand') ||
            errMsg.includes('overloaded') ||
            errMsg.includes('429') ||
            errMsg.includes('resource_exhausted') ||
            errMsg.includes('rate limit')
          ) {
            await sendTelegramMessage(
              chatId,
              '⚠️ El servicio de transcripción de voz está momentáneamente saturado. Por favor, volvé a enviar el audio en unos segundos o escribilo por texto.'
            );
            return NextResponse.json({ ok: true });
          }

          console.error('[Gemini Voice Error]:', err);
          await sendTelegramMessage(
            chatId,
            '⚠️ No pudimos procesar la nota de voz en este momento. Por favor intentá nuevamente en unos segundos o escribilo por texto.'
          );
          return NextResponse.json({ ok: true });
        }

        if (!parsedVoice || parsedVoice.amount <= 0) {
          await sendTelegramMessage(
            chatId,
            `🤔 No pude identificar un monto en el audio. Por favor intentá diciendo claramente el monto y concepto (ej: *"Gasté 3500 en café con medialunas en efectivo"* o *"Cobré 450000 de sueldo por transferencia"*).`
          );
          return NextResponse.json({ ok: true });
        }

        // Handle Income from voice note
        if (parsedVoice.type === 'income') {
          const matchedCategory = findBestIncomeCategory(
            parsedVoice.concept,
            parsedVoice.category_name || 'Otros Ingresos',
            incomeCategoriesList
          );
          const categoryId = matchedCategory?.id || null;
          const categoryName = matchedCategory?.name || parsedVoice.category_name || 'Otros Ingresos';
          const singleTxId = crypto.randomUUID();

          if (supabase) {
            const payload = {
              id: singleTxId,
              type: 'income',
              amount: parsedVoice.amount,
              currency: parsedVoice.currency,
              category_id: categoryId,
              date: today,
              note: parsedVoice.concept,
              payment_method: parsedVoice.payment_method,
              total_installments: 1,
              current_installment: 1,
              installment_total: 1,
              installment_current: 1,
            };

            const { error: insErr } = await supabase.from('transactions').insert([payload] as any).select();
            if (insErr) {
              console.error("Error guardando ingreso de voz en base de datos:", insErr);
              await sendTelegramMessage(chatId, `⚠️ Error al guardar en base de datos: ${insErr.message}`);
              return NextResponse.json({ ok: true });
            }
          }

          const methodLabel = PAYMENT_METHOD_LABELS[parsedVoice.payment_method] || '📲 Transf / MP';
          const currentMonthStr = today.slice(0, 7);
          const nuevoBalance = await getAvailableCashBalance(currentMonthStr, parsedVoice.currency, supabase);

          const reply = formatIncomeMessage({
            amount: parsedVoice.amount,
            currency: parsedVoice.currency,
            concept: parsedVoice.concept,
            categoryName,
            methodLabel,
            nuevoBalance,
          });

          await sendTelegramMessage(chatId, reply, {
            replyMarkup: getIncomeTransactionKeyboard(singleTxId),
          });

          return NextResponse.json({ ok: true });
        }

        const { amount, currency, concept, payment_method, category_id, category_name, installments } = parsedVoice;
        const totalInstallments = installments && installments > 1 ? installments : 1;
        const perInstallment = Number((amount / totalInstallments).toFixed(2));
        const dates = calculateInstallmentDates(today, totalInstallments);

        const parentId = totalInstallments > 1 ? crypto.randomUUID() : null;
        const singleTxId = crypto.randomUUID();
        const primaryId = totalInstallments > 1 ? parentId! : singleTxId;

        let creditCycle: StatementCycleInfo | undefined;
        let installmentCycles: StatementCycleInfo[] | undefined;
        let cardId: string | null = null;

        if (payment_method === 'tarjeta_credito') {
          let closing_day = 24;
          let due_day = 5;

          if (supabase) {
            const { data: cards, error: cardErr } = await supabase
              .from('credit_cards')
              .select('id, closing_day, due_day')
              .limit(1);

            if (cardErr) {
              console.warn('[Telegram Webhook] Error fetching credit_cards in voice:', cardErr);
            }

            const card = cards?.[0];
            cardId = card ? card.id : null;
            closing_day = card?.closing_day || 24;
            due_day = card?.due_day || 5;
          }

          installmentCycles = calculateInstallmentStatementCycles(
            today,
            totalInstallments,
            closing_day,
            due_day
          );
          creditCycle = installmentCycles[0];
        }

        if (supabase) {
          const recordsToInsert = [];
          for (let i = 0; i < totalInstallments; i++) {
            const installmentNote = totalInstallments > 1 ? `${concept} (Cuota ${i + 1}/${totalInstallments})` : concept;
            const stmtMonth = payment_method === 'tarjeta_credito' && installmentCycles?.[i]
              ? String(installmentCycles[i].statementMonth)
              : null;

            recordsToInsert.push({
              id: totalInstallments > 1 ? (i === 0 ? parentId! : crypto.randomUUID()) : singleTxId,
              type: 'expense' as const,
              amount: perInstallment,
              currency,
              category_id: category_id || null,
              date: dates[i] || today,
              note: installmentNote,
              payment_method,
              credit_card_id: payment_method === 'tarjeta_credito' ? (cardId || null) : null,
              statement_month: stmtMonth,
              total_installments: totalInstallments,
              current_installment: i + 1,
              installment_total: totalInstallments,
              installment_current: i + 1,
              parent_transaction_id: totalInstallments > 1 ? parentId : null,
            });
          }

          const { data, error: insErr } = await supabase.from('transactions').insert(recordsToInsert as any).select();
          if (insErr) {
            console.error("Error guardando gasto de voz de tarjeta de crédito:", insErr);
            await sendTelegramMessage(chatId, `⚠️ Error al guardar en base de datos: ${insErr.message}`);
            return NextResponse.json({ ok: true });
          }
        }

        const methodLabel = PAYMENT_METHOD_LABELS[payment_method] || '📲 Transf / MP';
        const catName = category_name || 'General';
        const currentMonthStr = today.slice(0, 7);
        const budgetFooter = await getBudgetAlertFooter(amount, currency, currentMonthStr, supabase);

        const reply = formatExpenseMessage({
          amount,
          currency,
          concept,
          categoryName: catName,
          methodLabel,
          installments,
          perInstallment,
          dates,
          creditCycle,
          installmentCycles,
        }) + budgetFooter;

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
    // 2.2 Photo / Receipt to Expense (OCR Image-to-Expense)
    // -------------------------------------------------------------
    const photos = message.photo;
    const document = message.document;
    const isImageDoc = document?.mime_type?.startsWith('image/');

    if ((photos && photos.length > 0) || isImageDoc) {
      try {
        const fileId = photos && photos.length > 0
          ? photos[photos.length - 1].file_id
          : document!.file_id;

        const fileInfo = await getTelegramFile(fileId);
        if (!fileInfo) {
          await sendTelegramMessage(chatId, '⚠️ No se pudo obtener la imagen de Telegram.');
          return NextResponse.json({ ok: true });
        }

        const imageBuffer = await downloadTelegramFile(fileInfo.filePath);
        if (!imageBuffer) {
          await sendTelegramMessage(chatId, '⚠️ No se pudo descargar la imagen del comprobante.');
          return NextResponse.json({ ok: true });
        }

        const mimeType = isImageDoc ? (document!.mime_type || 'image/jpeg') : 'image/jpeg';

        let parsedReceipt;
        try {
          parsedReceipt = await processReceiptImageWithGemini(
            imageBuffer,
            mimeType,
            categoriesList
          );
        } catch (err: any) {
          if (err.message === 'GEMINI_API_KEY_NOT_CONFIGURED') {
            await sendTelegramMessage(
              chatId,
              '📸 *Recibí tu comprobante*, pero falta configurar la variable `GEMINI_API_KEY` en tu `.env.local` o variables de entorno de Vercel para procesar imágenes con IA.'
            );
            return NextResponse.json({ ok: true });
          }

          const errMsg = (err?.message || '').toLowerCase();
          if (
            err.message === 'GEMINI_HIGH_DEMAND' ||
            errMsg.includes('503') ||
            errMsg.includes('high demand') ||
            errMsg.includes('overloaded') ||
            errMsg.includes('429') ||
            errMsg.includes('resource_exhausted') ||
            errMsg.includes('rate limit')
          ) {
            await sendTelegramMessage(
              chatId,
              '⚠️ El servicio de reconocimiento de imágenes está momentáneamente saturado. Por favor, volvé a enviar la foto en unos segundos.'
            );
            return NextResponse.json({ ok: true });
          }

          console.error('[Gemini Receipt Error]:', err);
          await sendTelegramMessage(
            chatId,
            '⚠️ No pudimos procesar la imagen en este momento. Por favor intentá nuevamente sacando una foto más clara o cargalo por texto.'
          );
          return NextResponse.json({ ok: true });
        }

        if (!parsedReceipt || parsedReceipt.confidence === 'low' || parsedReceipt.amount <= 0) {
          await sendTelegramMessage(
            chatId,
            '⚠️ No pude detectar un monto total en la imagen. Probá sacar la foto más de cerca o con mejor iluminación.'
          );
          return NextResponse.json({ ok: true });
        }

        const { amount, currency, concept, payment_method, category_id, category_name } = parsedReceipt;
        const txId = crypto.randomUUID();

        let creditCycle: StatementCycleInfo | undefined;
        let cardId: string | null = null;
        if (payment_method === 'tarjeta_credito') {
          let closing_day = 24;
          let due_day = 5;

          if (supabase) {
            const { data: cards, error: cardsError } = await supabase
              .from('credit_cards')
              .select('id, closing_day, due_day')
              .limit(1);

            if (cardsError) {
              console.warn('[Telegram Webhook] Error fetching credit_cards in photo:', cardsError);
            }

            const card = cards?.[0];
            cardId = card ? card.id : null;
            closing_day = card?.closing_day || 24;
            due_day = card?.due_day || 5;
          }

          creditCycle = calculateStatementCycle(today, closing_day, due_day);
        }

        if (supabase) {
          const payload = {
            id: txId,
            type: 'expense',
            amount,
            currency,
            category_id: category_id || null,
            date: today,
            note: concept,
            payment_method,
            credit_card_id: payment_method === 'tarjeta_credito' ? (cardId || null) : null,
            statement_month: creditCycle ? String(creditCycle.statementMonth) : null,
            total_installments: 1,
            current_installment: 1,
            installment_total: 1,
            installment_current: 1,
          };

          const { data, error: insErr } = await supabase.from('transactions').insert([payload] as any).select();
          if (insErr) {
            console.error("Error guardando comprobante en base de datos:", insErr);
            await sendTelegramMessage(chatId, `⚠️ Error al guardar en base de datos: ${insErr.message}`);
            return NextResponse.json({ ok: true });
          }
        }

        const methodLabel = PAYMENT_METHOD_LABELS[payment_method] || '📲 Transf / MP';
        const catName = category_name || 'General';
        const currentMonthStr = today.slice(0, 7);
        const budgetFooter = await getBudgetAlertFooter(amount, currency, currentMonthStr, supabase);

        const reply = formatExpenseMessage({
          amount,
          currency,
          concept,
          categoryName: catName,
          methodLabel,
          isReceipt: true,
          creditCycle,
        }) + budgetFooter;

        await sendTelegramMessage(chatId, reply, {
          replyMarkup: getMainTransactionKeyboard(txId),
        });

        return NextResponse.json({ ok: true });
      } catch (photoErr: any) {
        console.error('[Telegram Photo Handler Global Error]:', photoErr);
        await sendTelegramMessage(chatId, `⚠️ Error al procesar imagen: ${photoErr.message || 'Error desconocido'}`);
        return NextResponse.json({ ok: true });
      }
    }

    // -------------------------------------------------------------
    // 2.3 Text Message Handling
    // -------------------------------------------------------------
    const text = message.text;
    if (!text) {
      return NextResponse.json({ ok: true });
    }

    const command = parseTelegramMessage(text);

    switch (command.type) {
      case 'HELP': {
        const helpMessage = `💡 *Comandos disponibles de Gastos y Finanzas:*\n\n` +
          `• 🟢 *Registrar Ingresos:* \`/ingreso 250000 sueldo\`, \`cobre 450000 sueldo\`, \`me transfirieron 35000 venta\`, \`entraron 80000 mp\`\n` +
          `• 📸 *Fotos de Tickets:* Mandá una foto o factura para registrarla automáticamente\n` +
          `• 🎙 *Notas de voz:* Mandá un audio diciendo tu gasto o ingreso (ej: _"Gasté 4500 en el súper en efectivo"_ o _"Cobré 450000 de sueldo por transferencia"_)\n` +
          `• \`3500 cafe\` 👉 Registra gasto con botones interactivos\n` +
          `• \`3500 cafe efectivo\` 👉 Registra gasto directamente en efectivo\n` +
          `• \`12000 nafta debito\` 👉 Registra gasto con tarjeta de débito\n` +
          `• \`60000 zapatillas 3 cuotas credito\` 👉 Compra en cuotas con tarjeta de crédito\n` +
          `• \`25 usd hosting\` 👉 Registra gasto en USD\n\n` +
          `🔍 *Consultas Rápidas y Presupuesto:*\n` +
          `• \`/hoy\` 👉 Movimientos del día con desglose de ingresos, gastos y saldo neto\n` +
          `• \`/semana\` 👉 Gastos de los últimos 7 días\n` +
          `• \`/mes\` 👉 Resumen mensual con ingresos, gastos, saldo neto, tarjeta a vencer y presupuesto\n` +
          `• \`/setpresupuesto <monto>\` 👉 Fijar presupuesto mensual (ej: \`/setpresupuesto 600000\`)\n\n` +
          `📋 *Deudas y Préstamos:*\n` +
          `• \`debo 50000 mecanico\` 👉 Registra deuda que vos debés\n` +
          `• \`me debe 20000 juan\` 👉 Registra dinero que te deben\n` +
          `• \`pago 10000 deuda juan\` 👉 Registra pago y te dice cuánto resta\n` +
          `• \`/borrardeuda [persona]\` 👉 Borra una deuda (a favor o en contra)\n` +
          `• \`/deudas\` 👉 Muestra el estado de todas tus deudas activas`;
        await sendTelegramMessage(chatId, helpMessage);
        break;
      }

      case 'INCOME': {
        const { amount, currency, note, suggestedCategory, paymentMethod } = command;

        const matchedCategory = findBestIncomeCategory(note, suggestedCategory, incomeCategoriesList);
        const categoryId = matchedCategory?.id || null;
        const categoryName = matchedCategory?.name || suggestedCategory || 'Otros Ingresos';
        const methodLabel = PAYMENT_METHOD_LABELS[paymentMethod] || '📲 Transf / MP';

        const txId = crypto.randomUUID();

        if (supabase) {
          const payload = {
            id: txId,
            type: 'income',
            amount,
            currency,
            category_id: categoryId,
            date: today,
            note,
            payment_method: paymentMethod,
            total_installments: 1,
            current_installment: 1,
            installment_total: 1,
            installment_current: 1,
          };

          const { data, error } = await supabase.from('transactions').insert([payload] as any).select();
          if (error) {
            console.error("Error guardando ingreso en base de datos:", error);
            await sendTelegramMessage(chatId, `⚠️ Error al guardar en base de datos: ${error.message}`);
            return NextResponse.json({ ok: true });
          }
        }

        const currentMonthStr = today.slice(0, 7);
        const nuevoBalance = await getAvailableCashBalance(currentMonthStr, currency, supabase);

        const reply = formatIncomeMessage({
          amount,
          currency,
          concept: note,
          categoryName,
          methodLabel,
          nuevoBalance,
        });

        await sendTelegramMessage(chatId, reply, {
          replyMarkup: getIncomeTransactionKeyboard(txId),
        });
        break;
      }

      case 'EXPENSE': {
        const { amount, currency, note, installments, paymentMethod } = command;
        const totalInstallments = installments && installments > 1 ? installments : 1;
        const perInstallment = Number((amount / totalInstallments).toFixed(2));
        const dates = calculateInstallmentDates(today, totalInstallments);

        const methodLabel = PAYMENT_METHOD_LABELS[paymentMethod] || '📲 Transf / MP';

        // Intelligent category assignment
        const matchedCategory = findBestCategory(note, categoriesList);
        const categoryId = matchedCategory?.id || null;
        const categoryName = matchedCategory?.name || 'General';

        const parentId = totalInstallments > 1 ? crypto.randomUUID() : null;
        const singleTxId = crypto.randomUUID();
        const primaryId = totalInstallments > 1 ? parentId! : singleTxId;

        let creditCycle: StatementCycleInfo | undefined;
        let installmentCycles: StatementCycleInfo[] | undefined;
        let cardId: string | null = null;

        if (paymentMethod === 'tarjeta_credito') {
          let closing_day = 24;
          let due_day = 5;

          if (supabase) {
            // 1. Depuración y Fallback de credit_card_id
            const { data: cards, error: cardErr } = await supabase
              .from('credit_cards')
              .select('id, closing_day, due_day')
              .limit(1);

            if (cardErr) {
              console.warn('[Telegram Webhook] Error fetching credit_cards:', cardErr);
            }

            const card = cards?.[0];
            cardId = card ? card.id : null;

            // 2. Cálculo seguro de statement_month
            closing_day = card?.closing_day || 24;
            due_day = card?.due_day || 5;
          }

          installmentCycles = calculateInstallmentStatementCycles(
            today,
            totalInstallments,
            closing_day,
            due_day
          );
          creditCycle = installmentCycles[0];
        }

        if (supabase) {
          const recordsToInsert = [];
          for (let i = 0; i < totalInstallments; i++) {
            const installmentNote = totalInstallments > 1 ? `${note} (Cuota ${i + 1}/${totalInstallments})` : note;
            const stmtMonth = paymentMethod === 'tarjeta_credito' && installmentCycles?.[i]
              ? String(installmentCycles[i].statementMonth)
              : null;

            recordsToInsert.push({
              id: totalInstallments > 1 ? (i === 0 ? parentId! : crypto.randomUUID()) : singleTxId,
              type: 'expense' as const,
              amount: perInstallment,
              currency,
              category_id: categoryId,
              date: dates[i] || today,
              note: installmentNote,
              payment_method: paymentMethod, // 'tarjeta_credito'
              credit_card_id: paymentMethod === 'tarjeta_credito' ? (cardId || null) : null,
              statement_month: stmtMonth,
              total_installments: totalInstallments, // entero (default 1)
              current_installment: i + 1, // entero (default 1)
              installment_total: totalInstallments,
              installment_current: i + 1,
              parent_transaction_id: totalInstallments > 1 ? parentId : null,
            });
          }

          // 3. Manejo de error explícito en el insert
          const { data, error } = await supabase.from('transactions').insert(recordsToInsert as any).select();
          if (error) {
            console.error("Error guardando gasto de tarjeta de crédito:", error);
            await sendTelegramMessage(chatId, `⚠️ Error al guardar en base de datos: ${error.message}`);
            return NextResponse.json({ ok: true });
          }
        }

        const currentMonthStr = today.slice(0, 7);
        const budgetFooter = await getBudgetAlertFooter(amount, currency, currentMonthStr, supabase);

        const reply = formatExpenseMessage({
          amount,
          currency,
          concept: note,
          categoryName,
          methodLabel,
          installments,
          perInstallment,
          dates,
          creditCycle,
          installmentCycles,
        }) + budgetFooter;

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

        const debtsMarkup = activeDebts.length > 0
          ? {
              inline_keyboard: [
                [
                  {
                    text: '🗑 Borrar una Deuda',
                    callback_data: 'list_del_debts',
                  },
                ],
              ],
            }
          : undefined;

        await sendTelegramMessage(chatId, msg, { replyMarkup: debtsMarkup });
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

        if (createdDebtId) {
          await sendTelegramMessage(chatId, reply, {
            replyMarkup: {
              inline_keyboard: [
                [
                  {
                    text: '🗑 Deshacer / Borrar Deuda',
                    callback_data: `del_debt_${createdDebtId}`,
                  },
                ],
              ],
            },
          });
        } else {
          await sendTelegramMessage(chatId, reply);
        }
        break;
      }

      case 'DELETE_DEBT': {
        const { personName } = command;
        if (!supabase) {
          await sendTelegramMessage(chatId, `⚠️ Base de datos no disponible.`);
          break;
        }

        if (personName) {
          // Find debts matching person_name (both active or settled, owe or owed)
          const { data: debts, error: debtsError } = await supabase
            .from('debts')
            .select('*')
            .ilike('person_name', `%${personName}%`)
            .order('created_at', { ascending: false });

          if (debtsError || !debts || debts.length === 0) {
            await sendTelegramMessage(
              chatId,
              `❓ No encontré deudas registradas para "*${personName}*". Podés ver la lista completa con /deudas.`
            );
            break;
          }

          if (debts.length === 1) {
            const d = debts[0];
            await supabase.from('debt_payments').delete().eq('debt_id', d.id);
            await supabase.from('debts').delete().eq('id', d.id);

            const roleLabel = d.type === 'owe' ? 'Debías a' : 'Te debía';
            await sendTelegramMessage(
              chatId,
              `🗑 *Deuda eliminada correctamente:*\n• ${roleLabel}: *${d.person_name}*\n• Monto: *${formatCurrency(Number(d.total_amount), d.currency)}*`
            );
          } else {
            // Multiple debts found: show inline buttons to choose which to delete
            const buttons = debts.slice(0, 6).map(d => [
              {
                text: `🗑 ${d.type === 'owe' ? '🔴 Debo a' : '🟢 Me debe'} ${d.person_name} (${formatCurrency(Number(d.total_amount), d.currency)})`,
                callback_data: `del_debt_${d.id}`,
              },
            ]);

            await sendTelegramMessage(
              chatId,
              `🔍 Encontré varias deudas para "*${personName}*". Elegí cuál querés borrar:`,
              {
                replyMarkup: {
                  inline_keyboard: buttons,
                },
              }
            );
          }
        } else {
          // No person specified, list active debts to choose from
          const { data: debts } = await supabase
            .from('debts')
            .select('*')
            .eq('status', 'active')
            .order('created_at', { ascending: false })
            .limit(8);

          if (!debts || debts.length === 0) {
            await sendTelegramMessage(chatId, `🎉 No tenés deudas activas registradas para borrar.`);
            break;
          }

          const buttons = debts.map(d => [
            {
              text: `🗑 ${d.type === 'owe' ? '🔴 Debo a' : '🟢 Me debe'} ${d.person_name} (${formatCurrency(Number(d.total_amount), d.currency)})`,
              callback_data: `del_debt_${d.id}`,
            },
          ]);

          await sendTelegramMessage(
            chatId,
            `📋 *Elegí la deuda que querés borrar:*`,
            {
              replyMarkup: {
                inline_keyboard: buttons,
              },
            }
          );
        }
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

      case 'TODAY': {
        let incomeArs = 0;
        let incomeUsd = 0;
        let cashExpenseArs = 0;
        let cashExpenseUsd = 0;
        let creditExpenseArs = 0;
        let creditExpenseUsd = 0;
        let txCount = 0;

        if (supabase) {
          const { data: txs } = await supabase
            .from('transactions')
            .select('amount, currency, type, payment_method')
            .eq('date', today);

          const list = (txs || []) as any[];
          txCount = list.length;
          for (const t of list) {
            const amt = Number(t.amount) || 0;
            const cur = t.currency || 'ARS';
            if (t.type === 'income') {
              if (cur === 'USD') incomeUsd += amt;
              else incomeArs += amt;
            } else if (t.type === 'expense') {
              if (t.payment_method === 'tarjeta_credito') {
                if (cur === 'USD') creditExpenseUsd += amt;
                else creditExpenseArs += amt;
              } else {
                if (cur === 'USD') cashExpenseUsd += amt;
                else cashExpenseArs += amt;
              }
            }
          }
        }

        if (txCount === 0) {
          await sendTelegramMessage(
            chatId,
            `📅 *Movimientos de hoy:*\n\n¡Todavía no registraste ningún movimiento hoy!`
          );
        } else {
          const totalExpenseArs = cashExpenseArs + creditExpenseArs;
          const netArs = incomeArs - cashExpenseArs;
          const netUsd = incomeUsd - cashExpenseUsd;

          let msg = `📅 *Movimientos de Hoy (${today})*\n\n` +
            `🟢 *Ingresos:* ${formatCurrency(incomeArs, 'ARS')}`;
          if (incomeUsd > 0) msg += ` (+ ${formatCurrency(incomeUsd, 'USD')})`;

          msg += `\n🔴 *Gastos:* ${formatCurrency(totalExpenseArs, 'ARS')} (Caja: ${formatCurrency(cashExpenseArs, 'ARS')})`;
          if (cashExpenseUsd > 0 || creditExpenseUsd > 0) {
            msg += ` (+ ${formatCurrency(cashExpenseUsd + creditExpenseUsd, 'USD')})`;
          }

          msg += `\n⚖️ *Saldo Neto:* ${netArs >= 0 ? '+' : ''}${formatCurrency(netArs, 'ARS')}`;
          if (incomeUsd > 0 || cashExpenseUsd > 0) {
            msg += ` (${netUsd >= 0 ? '+' : ''}${formatCurrency(netUsd, 'USD')})`;
          }

          msg += `\n💳 *Tarjeta a Vencer:* ${formatCurrency(creditExpenseArs, 'ARS')}`;
          if (creditExpenseUsd > 0) msg += ` (+ ${formatCurrency(creditExpenseUsd, 'USD')})`;

          msg += `\n\n🧾 *Movimientos:* ${txCount}`;

          await sendTelegramMessage(chatId, msg);
        }
        break;
      }

      case 'WEEK': {
        const now = new Date();
        const sevenDaysAgo = new Date(now.getTime() - 6 * 24 * 60 * 60 * 1000);
        const y = sevenDaysAgo.getFullYear();
        const m = String(sevenDaysAgo.getMonth() + 1).padStart(2, '0');
        const d = String(sevenDaysAgo.getDate()).padStart(2, '0');
        const sevenDaysAgoIso = `${y}-${m}-${d}`;

        let totalArs = 0;
        let totalUsd = 0;
        let txCount = 0;

        if (supabase) {
          const { data: txs } = await supabase
            .from('transactions')
            .select('amount, currency')
            .gte('date', sevenDaysAgoIso)
            .lte('date', today)
            .eq('type', 'expense');

          const list = (txs || []) as any[];
          txCount = list.length;
          for (const t of list) {
            if (t.currency === 'USD') totalUsd += Number(t.amount);
            else totalArs += Number(t.amount);
          }
        }

        if (txCount === 0) {
          await sendTelegramMessage(
            chatId,
            `📅 *Gastos de los últimos 7 días:*\n\n¡No tenés gastos registrados en este período!`
          );
        } else {
          let msg = `📅 *Gastos de los últimos 7 días:*\n\n` +
            `💸 *Total:* ${formatCurrency(totalArs, 'ARS')} (${txCount} movimiento${txCount === 1 ? '' : 's'})`;
          if (totalUsd > 0) {
            msg += `\n🇺🇸 *Total USD:* ${formatCurrency(totalUsd, 'USD')}`;
          }
          await sendTelegramMessage(chatId, msg);
        }
        break;
      }

      case 'SUMMARY': {
        const now = new Date();
        const currentMonthStr = today.slice(0, 7);
        const startOfMonth = `${currentMonthStr}-01`;
        const endOfMonth = `${currentMonthStr}-31`;

        let incomeArs = 0;
        let incomeUsd = 0;
        let cashExpenseArs = 0;
        let cashExpenseUsd = 0;
        let creditExpenseArs = 0;
        let creditExpenseUsd = 0;
        let txCount = 0;
        const catTotals: Record<string, number> = {};

        if (supabase) {
          const { data: txs } = await supabase
            .from('transactions')
            .select('amount, currency, type, payment_method, category:categories(name)')
            .gte('date', startOfMonth)
            .lte('date', endOfMonth);

          const txList = (txs || []) as any[];
          txCount = txList.length;

          for (const tx of txList) {
            const amt = Number(tx.amount) || 0;
            const cur = tx.currency || 'ARS';
            if (tx.type === 'income') {
              if (cur === 'USD') incomeUsd += amt;
              else incomeArs += amt;
            } else if (tx.type === 'expense') {
              if (tx.payment_method === 'tarjeta_credito') {
                if (cur === 'USD') creditExpenseUsd += amt;
                else creditExpenseArs += amt;
              } else {
                if (cur === 'USD') cashExpenseUsd += amt;
                else cashExpenseArs += amt;
              }

              if (cur === 'ARS') {
                const catName = tx.category?.name || 'General';
                catTotals[catName] = (catTotals[catName] || 0) + amt;
              }
            }
          }
        }

        const monthName = now.toLocaleDateString('es-ES', { month: 'long' });
        const capitalizedMonth = monthName.charAt(0).toUpperCase() + monthName.slice(1);
        const year = now.getFullYear();

        const totalExpenseArs = cashExpenseArs + creditExpenseArs;
        const netArs = incomeArs - cashExpenseArs;
        const netUsd = incomeUsd - cashExpenseUsd;

        let msg = `📊 *Resumen Mensual - ${capitalizedMonth} ${year}*\n\n` +
          `🟢 *Ingresos:* ${formatCurrency(incomeArs, 'ARS')}`;
        if (incomeUsd > 0) msg += ` (+ ${formatCurrency(incomeUsd, 'USD')})`;

        msg += `\n🔴 *Gastos:* ${formatCurrency(totalExpenseArs, 'ARS')} (Caja: ${formatCurrency(cashExpenseArs, 'ARS')})`;
        if (cashExpenseUsd > 0 || creditExpenseUsd > 0) {
          msg += ` (+ ${formatCurrency(cashExpenseUsd + creditExpenseUsd, 'USD')})`;
        }

        msg += `\n⚖️ *Saldo Neto:* ${netArs >= 0 ? '+' : ''}${formatCurrency(netArs, 'ARS')}`;
        if (incomeUsd > 0 || cashExpenseUsd > 0) {
          msg += ` (${netUsd >= 0 ? '+' : ''}${formatCurrency(netUsd, 'USD')})`;
        }

        msg += `\n💳 *Tarjeta a Vencer:* ${formatCurrency(creditExpenseArs, 'ARS')}`;
        if (creditExpenseUsd > 0) msg += ` (+ ${formatCurrency(creditExpenseUsd, 'USD')})`;

        msg += `\n\n🧾 *Movimientos:* ${txCount}\n`;

        // Top 3 categories
        const sortedCats = Object.entries(catTotals)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 3);

        if (sortedCats.length > 0) {
          msg += `\n🏆 *Top Categorías de Gasto:*`;
          sortedCats.forEach(([catName, amt], idx) => {
            const pct = totalExpenseArs > 0 ? Math.round((amt / totalExpenseArs) * 100) : 0;
            msg += `\n${idx + 1}. ${getCategoryEmoji(catName)} *${catName}:* ${formatCurrency(amt, 'ARS')} (${pct}%)`;
          });
          msg += `\n`;
        }

        // Budget check
        if (supabase) {
          const budget = await getMonthlyBudget(currentMonthStr, 'ARS', supabase);
          if (budget && budget.amount > 0) {
            const budgetAmt = Number(budget.amount);
            const pct = Math.round((totalExpenseArs / budgetAmt) * 100);
            msg += `\n🎯 *Presupuesto:* ${formatCurrency(totalExpenseArs, 'ARS')} / ${formatCurrency(budgetAmt, 'ARS')} (${pct}%)`;
            if (pct >= 100) {
              msg += `\n🚨 *Límite mensual superado*`;
            } else if (pct >= 80) {
              msg += `\n⚠️ *Atención: superaste el 80% del presupuesto*`;
            }
          } else {
            msg += `\n💡 _Tip: Podés fijar un presupuesto mensual con /setpresupuesto <monto>_`;
          }
        }

        await sendTelegramMessage(chatId, msg);
        break;
      }

      case 'SET_BUDGET': {
        const { amount } = command;
        const currentMonthStr = today.slice(0, 7);

        if (supabase) {
          await setMonthlyBudget(currentMonthStr, amount, 'ARS', supabase);
        }

        const now = new Date();
        const monthName = now.toLocaleDateString('es-ES', { month: 'long' });
        const capitalizedMonth = monthName.charAt(0).toUpperCase() + monthName.slice(1);

        const { total: currentSpent } = await getMonthlySpent(currentMonthStr, 'ARS', supabase);
        const pct = amount > 0 ? Math.round((currentSpent / amount) * 100) : 0;
        const remaining = Math.max(0, amount - currentSpent);

        let reply = `🎯 *Presupuesto de ${capitalizedMonth} fijado en ${formatCurrency(amount, 'ARS')}*\n\n` +
          `📊 *Gastado hasta ahora:* ${formatCurrency(currentSpent, 'ARS')} (${pct}%)\n`;

        if (currentSpent > amount) {
          reply += `🚨 *Excedido por:* ${formatCurrency(currentSpent - amount, 'ARS')}`;
        } else {
          reply += `💰 *Disponible restante:* ${formatCurrency(remaining, 'ARS')}`;
        }

        await sendTelegramMessage(chatId, reply);
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
          `• \`/borrardeuda juan\`\n` +
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
