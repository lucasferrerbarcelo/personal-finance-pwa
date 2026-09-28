import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { Database, Category, Transaction, DebtSummary, DebtPayment, Debt, DebtType, Currency, TransactionType } from './types';
import { INITIAL_CATEGORIES, INITIAL_TRANSACTIONS, INITIAL_DEBTS } from '../mockData';
import { calculateInstallmentDates, getCurrentDateISO } from '../utils';

const rawUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseUrl = rawUrl.replace(/\/rest\/v1\/?$/, '').replace(/\/$/, '');
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

export const isSupabaseConfigured = () => {
  return (
    Boolean(supabaseUrl) &&
    Boolean(supabaseAnonKey) &&
    !supabaseUrl.includes('your_supabase') &&
    !supabaseAnonKey.includes('your_supabase')
  );
};

export const supabase = isSupabaseConfigured()
  ? createSupabaseClient<any>(supabaseUrl, supabaseAnonKey)
  : null;

// Local fallback store keys
const STORAGE_KEYS = {
  CATEGORIES: 'pf_categories',
  TRANSACTIONS: 'pf_transactions',
  DEBTS: 'pf_debts',
  PAYMENTS: 'pf_payments',
};

// Helper to get local data safely
function getLocalItem<T>(key: string, defaultValue: T): T {
  if (typeof window === 'undefined') return defaultValue;
  try {
    const stored = localStorage.getItem(key);
    return stored ? JSON.parse(stored) : defaultValue;
  } catch {
    return defaultValue;
  }
}

function setLocalItem<T>(key: string, value: T): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    console.error('Failed to save to localStorage:', e);
  }
}

// ----------------- Data API (Supabase with LocalStorage Fallback) -----------------

export async function fetchCategories(): Promise<Category[]> {
  if (supabase) {
    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .order('name');
    if (!error && data && data.length > 0) return data;
  }
  return getLocalItem<Category[]>(STORAGE_KEYS.CATEGORIES, INITIAL_CATEGORIES);
}

export async function fetchTransactions(): Promise<Transaction[]> {
  if (supabase) {
    const { data, error } = await supabase
      .from('transactions')
      .select('*, category:categories(*)')
      .order('date', { ascending: false });
    if (!error && data) return data as Transaction[];
  }
  const localTx = getLocalItem<Transaction[]>(STORAGE_KEYS.TRANSACTIONS, INITIAL_TRANSACTIONS);
  const categories = await fetchCategories();
  const catMap = new Map(categories.map(c => [c.id, c]));
  return localTx.map(tx => ({
    ...tx,
    category: tx.category_id ? catMap.get(tx.category_id) || null : null,
  }));
}

export interface CreateTransactionParams {
  type: TransactionType;
  amount: number;
  currency: Currency;
  category_id: string | null;
  date: string;
  note: string | null;
  installments?: number; // total installments (1 = single payment)
}

export async function createTransaction(params: CreateTransactionParams): Promise<Transaction[]> {
  const installments = params.installments && params.installments > 1 ? params.installments : 1;
  const amountPerInstallment = Number((params.amount / installments).toFixed(2));
  const dates = calculateInstallmentDates(params.date, installments);
  const parentId = installments > 1 ? `tx-${Date.now()}` : null;

  const newRecords: Transaction[] = [];

  for (let i = 0; i < installments; i++) {
    const noteSuffix = installments > 1 ? ` (Cuota ${i + 1}/${installments})` : '';
    const cleanNote = params.note ? `${params.note}${noteSuffix}` : (installments > 1 ? `Cuota ${i + 1}/${installments}` : '');

    const record: Transaction = {
      id: installments > 1 && i === 0 ? parentId! : `tx-${Date.now()}-${i}`,
      type: params.type,
      amount: amountPerInstallment,
      currency: params.currency,
      category_id: params.category_id,
      date: dates[i],
      note: cleanNote,
      installment_current: installments > 1 ? i + 1 : null,
      installment_total: installments > 1 ? installments : null,
      parent_transaction_id: installments > 1 ? parentId : null,
      created_at: new Date().toISOString(),
    };

    newRecords.push(record);
  }

  if (supabase) {
    const { data, error } = await supabase
      .from('transactions')
      .insert(
        newRecords.map(r => ({
          type: r.type,
          amount: r.amount,
          currency: r.currency,
          category_id: r.category_id,
          date: r.date,
          note: r.note,
          installment_current: r.installment_current,
          installment_total: r.installment_total,
          parent_transaction_id: r.parent_transaction_id,
        }))
      )
      .select('*, category:categories(*)');

    if (!error && data) return data as Transaction[];
  }

  // Fallback to local storage
  const current = getLocalItem<Transaction[]>(STORAGE_KEYS.TRANSACTIONS, INITIAL_TRANSACTIONS);
  const updated = [...newRecords, ...current];
  setLocalItem(STORAGE_KEYS.TRANSACTIONS, updated);
  return newRecords;
}

export async function updateTransaction(
  id: string,
  params: Partial<Omit<Transaction, 'id' | 'created_at'>>
): Promise<boolean> {
  if (supabase) {
    const { error } = await supabase.from('transactions').update(params).eq('id', id);
    if (!error) return true;
  }
  const current = getLocalItem<Transaction[]>(STORAGE_KEYS.TRANSACTIONS, INITIAL_TRANSACTIONS);
  const updated = current.map(tx => (tx.id === id ? { ...tx, ...params } : tx));
  setLocalItem(STORAGE_KEYS.TRANSACTIONS, updated);
  return true;
}

export async function deleteTransaction(id: string): Promise<boolean> {
  if (supabase) {
    const { error } = await supabase.from('transactions').delete().eq('id', id);
    if (!error) return true;
  }
  const current = getLocalItem<Transaction[]>(STORAGE_KEYS.TRANSACTIONS, INITIAL_TRANSACTIONS);
  const updated = current.filter(tx => tx.id !== id);
  setLocalItem(STORAGE_KEYS.TRANSACTIONS, updated);
  return true;
}

// ----------------- Debts & Payments API -----------------

export async function fetchDebts(): Promise<DebtSummary[]> {
  if (supabase) {
    const { data, error } = await supabase
      .from('v_debts_summary')
      .select('*')
      .order('created_at', { ascending: false });

    if (!error && data) {
      // Also fetch payments for complete detail
      const { data: payments } = await supabase
        .from('debt_payments')
        .select('*')
        .order('date', { ascending: false });

      const payMap = new Map<string, DebtPayment[]>();
      payments?.forEach(p => {
        const arr = payMap.get(p.debt_id) || [];
        arr.push(p);
        payMap.set(p.debt_id, arr);
      });

      return data.map(d => ({
        ...d,
        payments: payMap.get(d.id) || [],
      }));
    }
  }

  return getLocalItem<DebtSummary[]>(STORAGE_KEYS.DEBTS, INITIAL_DEBTS);
}

export interface CreateDebtParams {
  type: DebtType;
  person_name: string;
  total_amount: number;
  currency: Currency;
  note?: string | null;
}

export async function createDebt(params: CreateDebtParams): Promise<DebtSummary> {
  const newDebt: DebtSummary = {
    id: `debt-${Date.now()}`,
    type: params.type,
    person_name: params.person_name,
    total_amount: params.total_amount,
    currency: params.currency,
    status: 'active',
    note: params.note || null,
    created_at: new Date().toISOString(),
    total_paid: 0,
    remaining_amount: params.total_amount,
    payments: [],
  };

  if (supabase) {
    const { data, error } = await supabase
      .from('debts')
      .insert({
        type: params.type,
        person_name: params.person_name,
        total_amount: params.total_amount,
        currency: params.currency,
        status: 'active',
        note: params.note || null,
      })
      .select()
      .single();

    if (!error && data) {
      return {
        ...data,
        total_paid: 0,
        remaining_amount: data.total_amount,
        payments: [],
      };
    }
  }

  const current = getLocalItem<DebtSummary[]>(STORAGE_KEYS.DEBTS, INITIAL_DEBTS);
  const updated = [newDebt, ...current];
  setLocalItem(STORAGE_KEYS.DEBTS, updated);
  return newDebt;
}

export interface AddPaymentParams {
  debt_id: string;
  amount: number;
  date?: string;
  note?: string | null;
}

export async function addDebtPayment(params: AddPaymentParams): Promise<{
  payment: DebtPayment;
  debt: DebtSummary;
}> {
  const paymentDate = params.date || getCurrentDateISO();
  const payment: DebtPayment = {
    id: `pay-${Date.now()}`,
    debt_id: params.debt_id,
    amount: params.amount,
    date: paymentDate,
    note: params.note || null,
    created_at: new Date().toISOString(),
  };

  if (supabase) {
    // 1. Insert payment
    await supabase.from('debt_payments').insert({
      debt_id: params.debt_id,
      amount: params.amount,
      date: paymentDate,
      note: params.note || null,
    });

    // 2. Fetch updated debt summary from view
    const { data: updatedDebt } = await supabase
      .from('v_debts_summary')
      .select('*')
      .eq('id', params.debt_id)
      .single();

    if (updatedDebt) {
      // If remaining is 0 or less, mark settled
      if (updatedDebt.remaining_amount <= 0 && updatedDebt.status !== 'settled') {
        await supabase
          .from('debts')
          .update({ status: 'settled' })
          .eq('id', params.debt_id);
        updatedDebt.status = 'settled';
      }

      const { data: payments } = await supabase
        .from('debt_payments')
        .select('*')
        .eq('debt_id', params.debt_id)
        .order('date', { ascending: false });

      return {
        payment,
        debt: {
          ...updatedDebt,
          payments: payments || [],
        },
      };
    }
  }

  // Fallback to local state
  const debts = getLocalItem<DebtSummary[]>(STORAGE_KEYS.DEBTS, INITIAL_DEBTS);
  let resultDebt: DebtSummary | null = null;

  const updatedDebts = debts.map(d => {
    if (d.id === params.debt_id) {
      const newTotalPaid = d.total_paid + params.amount;
      const newRemaining = Math.max(0, d.total_amount - newTotalPaid);
      const newStatus = newRemaining <= 0 ? 'settled' : d.status;
      const updatedPayments = [payment, ...(d.payments || [])];

      resultDebt = {
        ...d,
        total_paid: newTotalPaid,
        remaining_amount: newRemaining,
        status: newStatus as any,
        payments: updatedPayments,
      };
      return resultDebt;
    }
    return d;
  });

  setLocalItem(STORAGE_KEYS.DEBTS, updatedDebts);

  if (!resultDebt) {
    throw new Error('Debt not found');
  }

  return { payment, debt: resultDebt };
}
