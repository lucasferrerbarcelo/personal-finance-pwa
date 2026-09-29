import { Budget, Currency } from '../supabase/types';
import { getServiceSupabase } from '../supabase/server';
import { supabase as clientSupabase } from '../supabase/client';

/**
 * Retrieves the budget for a specific month (format 'YYYY-MM')
 */
export async function getMonthlyBudget(
  monthStr: string,
  currency: Currency = 'ARS',
  customClient?: any
): Promise<Budget | null> {
  const sb = customClient || getServiceSupabase() || clientSupabase;

  if (sb) {
    try {
      const { data, error } = await sb
        .from('budgets')
        .select('*')
        .eq('month', monthStr)
        .maybeSingle();

      if (!error && data) {
        return {
          id: data.id,
          month: data.month,
          amount: Number(data.amount),
          currency: data.currency || currency,
          created_at: data.created_at,
        };
      }
    } catch (err) {
      console.warn('[Budgets Service] Error fetching budget from Supabase:', err);
    }
  }

  // Fallback to localStorage if in browser environment
  if (typeof window !== 'undefined') {
    try {
      const stored = localStorage.getItem(`pf_budget_${monthStr}`);
      if (stored) return JSON.parse(stored);
    } catch (e) {
      console.error(e);
    }
  }

  return null;
}

/**
 * Calculates total expenses and transaction count for a given month (format 'YYYY-MM')
 */
export async function getMonthlySpent(
  monthStr: string,
  currency: Currency = 'ARS',
  customClient?: any
): Promise<{ total: number; count: number }> {
  const sb = customClient || getServiceSupabase() || clientSupabase;
  const startDate = `${monthStr}-01`;
  const endDate = `${monthStr}-31`;

  if (sb) {
    try {
      const { data, error } = await sb
        .from('transactions')
        .select('amount')
        .gte('date', startDate)
        .lte('date', endDate)
        .eq('type', 'expense')
        .eq('currency', currency);

      if (!error && data) {
        const total = data.reduce((sum: number, tx: any) => sum + (Number(tx.amount) || 0), 0);
        return { total, count: data.length };
      }
    } catch (err) {
      console.warn('[Budgets Service] Error fetching monthly expenses from Supabase:', err);
    }
  }

  // Fallback to localStorage if in browser environment
  if (typeof window !== 'undefined') {
    try {
      const stored = localStorage.getItem('pf_transactions');
      if (stored) {
        const txs = JSON.parse(stored);
        const filtered = txs.filter((t: any) =>
          t.type === 'expense' &&
          (t.currency || 'ARS') === currency &&
          t.date &&
          t.date.startsWith(monthStr)
        );
        const total = filtered.reduce((sum: number, tx: any) => sum + (Number(tx.amount) || 0), 0);
        return { total, count: filtered.length };
      }
    } catch (e) {
      console.error(e);
    }
  }

  return { total: 0, count: 0 };
}

/**
 * Upserts the monthly budget for a given month ('YYYY-MM')
 */
export async function setMonthlyBudget(
  monthStr: string,
  amount: number,
  currency: Currency = 'ARS',
  customClient?: any
): Promise<Budget> {
  const sb = customClient || getServiceSupabase() || clientSupabase;

  if (sb) {
    try {
      // Check existing budget for this month
      const { data: existing } = await sb
        .from('budgets')
        .select('id')
        .eq('month', monthStr)
        .maybeSingle();

      if (existing?.id) {
        const { data, error } = await sb
          .from('budgets')
          .update({ amount, currency })
          .eq('id', existing.id)
          .select()
          .single();

        if (!error && data) {
          return {
            id: data.id,
            month: data.month,
            amount: Number(data.amount),
            currency: data.currency,
            created_at: data.created_at,
          };
        }
      } else {
        const { data, error } = await sb
          .from('budgets')
          .insert({
            month: monthStr,
            amount,
            currency,
          })
          .select()
          .single();

        if (!error && data) {
          return {
            id: data.id,
            month: data.month,
            amount: Number(data.amount),
            currency: data.currency,
            created_at: data.created_at,
          };
        }
      }
    } catch (err) {
      console.warn('[Budgets Service] Error saving budget to Supabase:', err);
    }
  }

  // Fallback to localStorage
  const fallbackBudget: Budget = {
    id: `budget-${Date.now()}`,
    month: monthStr,
    amount,
    currency,
    created_at: new Date().toISOString(),
  };

  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(`pf_budget_${monthStr}`, JSON.stringify(fallbackBudget));
    } catch (e) {
      console.error(e);
    }
  }

  return fallbackBudget;
}
