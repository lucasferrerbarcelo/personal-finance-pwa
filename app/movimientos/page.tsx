'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Transaction, Category, Currency, PaymentMethod, TransactionType } from '@/lib/supabase/types';
import { fetchTransactions, fetchCategories } from '@/lib/supabase/client';
import { TransactionFilters } from '@/components/Movimientos/TransactionFilters';
import { TransactionList } from '@/components/Movimientos/TransactionList';
import { useApp } from '@/components/Layout/AppShell';
import { formatCurrency, formatMonthYear } from '@/lib/utils';
import { PlusCircle, RefreshCw, TrendingDown, TrendingUp } from 'lucide-react';

export default function MovimientosPage() {
  const { openNewTxModal, openEditTxModal, refreshTrigger, triggerRefresh } = useApp();

  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters state
  const [selectedMonth, setSelectedMonth] = useState<Date>(new Date());
  const [currencyFilter, setCurrencyFilter] = useState<'ALL' | Currency>('ALL');
  const [typeFilter, setTypeFilter] = useState<'ALL' | TransactionType>('ALL');
  const [categoryFilter, setCategoryFilter] = useState<string>('');
  const [paymentMethodFilter, setPaymentMethodFilter] = useState<'ALL' | PaymentMethod>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const loadData = async () => {
    setLoading(true);
    try {
      const [txs, cats] = await Promise.all([fetchTransactions(), fetchCategories()]);
      setTransactions(txs);
      setCategories(cats);
    } catch (err) {
      console.error('Error loading movements:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [refreshTrigger]);

  // Filtered transactions calculation
  const filteredTransactions = useMemo(() => {
    const year = selectedMonth.getFullYear();
    const month = String(selectedMonth.getMonth() + 1).padStart(2, '0');
    const monthPrefix = `${year}-${month}`;

    return transactions.filter(t => {
      // 1. Month match
      if (!t.date.startsWith(monthPrefix)) return false;

      // 2. Currency match
      if (currencyFilter !== 'ALL' && t.currency !== currencyFilter) return false;

      // 3. Type match
      if (typeFilter !== 'ALL' && t.type !== typeFilter) return false;

      // 4. Category match
      if (categoryFilter && t.category_id !== categoryFilter) return false;

      // 5. Payment method match
      if (paymentMethodFilter !== 'ALL' && (t.payment_method || 'transferencia') !== paymentMethodFilter) return false;

      // 6. Search query
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const noteMatch = t.note?.toLowerCase().includes(query);
        const catMatch = t.category?.name.toLowerCase().includes(query);
        if (!noteMatch && !catMatch) return false;
      }

      return true;
    });
  }, [transactions, selectedMonth, currencyFilter, typeFilter, categoryFilter, paymentMethodFilter, searchQuery]);

  // Metrics for the filtered view
  const totalExpensesArs = filteredTransactions
    .filter(t => t.type === 'expense' && t.currency === 'ARS')
    .reduce((sum, t) => sum + Number(t.amount), 0);

  const totalIncomeArs = filteredTransactions
    .filter(t => t.type === 'income' && t.currency === 'ARS')
    .reduce((sum, t) => sum + Number(t.amount), 0);

  const totalExpensesUsd = filteredTransactions
    .filter(t => t.type === 'expense' && t.currency === 'USD')
    .reduce((sum, t) => sum + Number(t.amount), 0);

  const totalIncomeUsd = filteredTransactions
    .filter(t => t.type === 'income' && t.currency === 'USD')
    .reduce((sum, t) => sum + Number(t.amount), 0);

  return (
    <div className="space-y-6">
      {/* Page Title & Add Button */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <span className="inline-block px-2 py-0.5 bg-black text-white font-mono text-[10px] font-black tracking-wider uppercase rounded-md border border-black mb-1">
            [HISTORIAL COMPLETO]
          </span>
          <h2 className="text-xl md:text-2xl font-black text-black tracking-tight">
            Movimientos
          </h2>
          <p className="text-xs font-mono font-medium text-zinc-600 mt-0.5">
            Registro detallado de transacciones e historial
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={loadData}
            disabled={loading}
            className="p-2 text-black bg-white hover:bg-zinc-100 rounded-xl border-2 border-black shadow-[2px_2px_0px_0px_#000] transition-all active:translate-x-[1px] active:translate-y-[1px] disabled:opacity-50"
            title="Recargar"
          >
            <RefreshCw className={`w-4 h-4 stroke-[2.5px] ${loading ? 'animate-spin text-[#FACC15]' : ''}`} />
          </button>
          <button
            onClick={openNewTxModal}
            className="flex items-center gap-2 bg-[#86EFAC] hover:bg-[#4ade80] text-black font-black text-xs py-2 px-3.5 rounded-xl border-2 border-black shadow-[3px_3px_0px_0px_#000] transition-all active:translate-x-[2px] active:translate-y-[2px] active:shadow-[1px_1px_0px_0px_#000]"
          >
            <PlusCircle className="w-4 h-4 stroke-[2.5px]" />
            <span>Nuevo Movimiento</span>
          </button>
        </div>
      </div>

      {/* Filter Stats Pill Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="rounded-xl bg-white border-2 border-black p-3 shadow-[2px_2px_0px_0px_#000]">
          <span className="text-[10px] font-mono font-bold uppercase text-zinc-600 block">Gastos Mes (ARS)</span>
          <span className="text-base font-mono font-black tabular-nums text-black mt-0.5 block">
            {formatCurrency(totalExpensesArs, 'ARS')}
          </span>
        </div>
        <div className="rounded-xl bg-[#86EFAC]/30 border-2 border-black p-3 shadow-[2px_2px_0px_0px_#000]">
          <span className="text-[10px] font-mono font-bold uppercase text-emerald-900 block">Ingresos Mes (ARS)</span>
          <span className="text-base font-mono font-black tabular-nums text-emerald-800 mt-0.5 block">
            {formatCurrency(totalIncomeArs, 'ARS')}
          </span>
        </div>
        <div className="rounded-xl bg-white border-2 border-black p-3 shadow-[2px_2px_0px_0px_#000]">
          <span className="text-[10px] font-mono font-bold uppercase text-zinc-600 block">Gastos Mes (USD)</span>
          <span className="text-base font-mono font-black tabular-nums text-black mt-0.5 block">
            {formatCurrency(totalExpensesUsd, 'USD')}
          </span>
        </div>
        <div className="rounded-xl bg-[#86EFAC]/30 border-2 border-black p-3 shadow-[2px_2px_0px_0px_#000]">
          <span className="text-[10px] font-mono font-bold uppercase text-emerald-900 block">Ingresos Mes (USD)</span>
          <span className="text-base font-mono font-black tabular-nums text-emerald-800 mt-0.5 block">
            {formatCurrency(totalIncomeUsd, 'USD')}
          </span>
        </div>
      </div>

      {/* Interactive Filters */}
      <TransactionFilters
        selectedMonth={selectedMonth}
        onMonthChange={setSelectedMonth}
        currencyFilter={currencyFilter}
        onCurrencyChange={setCurrencyFilter}
        typeFilter={typeFilter}
        onTypeChange={setTypeFilter}
        categoryFilter={categoryFilter}
        onCategoryChange={setCategoryFilter}
        paymentMethodFilter={paymentMethodFilter}
        onPaymentMethodChange={setPaymentMethodFilter}
        categories={categories}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
      />

      {/* Transactions List */}
      <TransactionList
        transactions={filteredTransactions}
        onEdit={openEditTxModal}
        onRefresh={triggerRefresh}
      />
    </div>
  );
}
