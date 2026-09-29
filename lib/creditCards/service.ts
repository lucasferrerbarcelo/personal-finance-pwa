import { CreditCard, Currency } from '../supabase/types';
import { supabase as defaultClient } from '../supabase/client';
import { formatStatementMonthName } from './calculator';
import { getCurrentDateISO } from '../utils';

export const DEFAULT_CREDIT_CARD: CreditCard = {
  id: 'default-card-1',
  name: 'Visa Galicia',
  closing_day: 24,
  due_day: 5,
  is_default: true,
};

const STORAGE_KEY = 'pf_credit_cards';

function getLocalCards(): CreditCard[] {
  if (typeof window === 'undefined') return [DEFAULT_CREDIT_CARD];
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return [DEFAULT_CREDIT_CARD];
    const parsed = JSON.parse(stored);
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : [DEFAULT_CREDIT_CARD];
  } catch {
    return [DEFAULT_CREDIT_CARD];
  }
}

function setLocalCards(cards: CreditCard[]) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(cards));
  } catch (e) {
    console.error('Failed to save credit cards to localStorage:', e);
  }
}

export async function fetchCreditCards(client?: any): Promise<CreditCard[]> {
  const sb = client || defaultClient;
  if (sb) {
    try {
      const { data, error } = await sb
        .from('credit_cards')
        .select('*')
        .order('created_at', { ascending: true });

      if (!error && data && data.length > 0) {
        return data as CreditCard[];
      }
    } catch (e) {
      console.warn('Error fetching credit_cards from Supabase:', e);
    }
  }

  return getLocalCards();
}

export async function getDefaultCreditCard(client?: any): Promise<CreditCard> {
  const cards = await fetchCreditCards(client);
  const def = cards.find(c => c.is_default);
  return def || cards[0] || DEFAULT_CREDIT_CARD;
}

export async function saveCreditCard(
  card: { id?: string; name: string; closing_day: number; due_day: number; is_default?: boolean },
  client?: any
): Promise<CreditCard> {
  const sb = client || defaultClient;

  if (sb) {
    try {
      if (card.id && !card.id.startsWith('default-card')) {
        const { data, error } = await sb
          .from('credit_cards')
          .update({
            name: card.name,
            closing_day: card.closing_day,
            due_day: card.due_day,
            is_default: card.is_default ?? true,
          })
          .eq('id', card.id)
          .select()
          .single();

        if (!error && data) return data as CreditCard;
      } else {
        const { data, error } = await sb
          .from('credit_cards')
          .insert({
            name: card.name,
            closing_day: card.closing_day,
            due_day: card.due_day,
            is_default: card.is_default ?? true,
          })
          .select()
          .single();

        if (!error && data) return data as CreditCard;
      }
    } catch (e) {
      console.warn('Error saving credit_card to Supabase:', e);
    }
  }

  // Local storage fallback
  const current = getLocalCards();
  const existingIdx = card.id ? current.findIndex(c => c.id === card.id) : -1;
  const newCard: CreditCard = {
    id: card.id || `card-${Date.now()}`,
    name: card.name,
    closing_day: card.closing_day,
    due_day: card.due_day,
    is_default: card.is_default ?? true,
  };

  let updated: CreditCard[];
  if (existingIdx >= 0) {
    updated = [...current];
    updated[existingIdx] = newCard;
  } else {
    updated = [newCard, ...current];
  }

  setLocalCards(updated);
  return newCard;
}

export async function deleteCreditCard(id: string, client?: any): Promise<boolean> {
  const sb = client || defaultClient;
  if (sb && !id.startsWith('default-card')) {
    try {
      const { error } = await sb.from('credit_cards').delete().eq('id', id);
      if (!error) return true;
    } catch (e) {
      console.warn('Error deleting credit_card from Supabase:', e);
    }
  }

  const current = getLocalCards();
  const updated = current.filter(c => c.id !== id);
  setLocalCards(updated.length > 0 ? updated : [DEFAULT_CREDIT_CARD]);
  return true;
}

/**
 * Marks a credit card statement as paid:
 * 1. Sets statement_paid = true on all matching credit card transactions.
 * 2. Creates a cash expense (debit/transferencia) to discount cash balance.
 */
export async function markStatementAsPaid(
  statementMonth: string,
  amount: number,
  currency: Currency = 'ARS',
  client?: any
): Promise<{ success: boolean; newTransactionId?: string }> {
  const sb = client || defaultClient;
  const today = getCurrentDateISO();
  const monthName = formatStatementMonthName(statementMonth);
  const note = `Pago Resumen Tarjeta Crédito - ${monthName}`;

  if (sb) {
    try {
      // 1. Mark existing credit transactions as paid
      await sb
        .from('transactions')
        .update({ statement_paid: true })
        .eq('statement_month', statementMonth)
        .eq('payment_method', 'tarjeta_credito');

      // 2. Insert cash expense
      const { data: newTx, error: insErr } = await sb
        .from('transactions')
        .insert({
          type: 'expense',
          amount,
          currency,
          date: today,
          note,
          payment_method: 'transferencia',
        })
        .select()
        .single();

      if (!insErr && newTx) {
        return { success: true, newTransactionId: newTx.id };
      }
    } catch (e) {
      console.error('Error marking statement as paid in Supabase:', e);
    }
  }

  // Fallback for localStorage
  if (typeof window !== 'undefined') {
    try {
      const txKey = 'pf_transactions';
      const raw = localStorage.getItem(txKey);
      if (raw) {
        const txs = JSON.parse(raw);
        const updatedTxs = txs.map((t: any) => {
          if (t.statement_month === statementMonth && t.payment_method === 'tarjeta_credito') {
            return { ...t, statement_paid: true };
          }
          return t;
        });

        // Add payment transaction
        const paymentTx = {
          id: `tx-pay-${Date.now()}`,
          type: 'expense',
          amount,
          currency,
          date: today,
          note,
          payment_method: 'transferencia',
          created_at: new Date().toISOString(),
        };

        updatedTxs.unshift(paymentTx);
        localStorage.setItem(txKey, JSON.stringify(updatedTxs));
        return { success: true, newTransactionId: paymentTx.id };
      }
    } catch (e) {
      console.error('Error updating localStorage for statement payment:', e);
    }
  }

  return { success: true };
}
