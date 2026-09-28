'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Transaction, Category, Currency, TransactionType } from '@/lib/supabase/types';
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

      // 5. Search query
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const noteMatch = t.note?.toLowerCase().includes(query);
        const catMatch = t.category?.name.toLowerCase().includes(query);
        if (!noteMatch && !catMatch) return false;
      }

      return true;
    });
  }, [transactions, selectedMonth, currencyFilter, typeFilter, categoryFilter, searchQuery]);

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
          <h2 className="text-xl md:text-2xl font-black text-white tracking-tight">
            Movimientos
          </h2>
          <p className="text-xs text-zinc-400 mt-0.5">
            Registro detallado de transacciones e historial
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={loadData}
            disabled={loading}
            className="p-2 text-zinc-400 hover:text-white bg-white/5 hover:bg-white/10 rounded-xl border border-white/5 transition-all disabled:opacity-50"
            title="Recargar"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-emerald-400' : ''}`} />
          </button>
          <button
            onClick={openNewTxModal}
            className="flex items-center gap-2 bg-gradient-to-r from-emerald-500 to-emerald-400 hover:from-emerald-400 hover:to-emerald-300 text-black font-semibold text-xs py-2 px-3.5 rounded-xl shadow-lg shadow-emerald-500/20 transition-all active:scale-95"
          >
            <PlusCircle className="w-4 h-4 stroke-[2.5px]" />
            <span>Nuevo Movimiento</span>
          </button>
        </div>
      </div>

      {/* Filter Stats Pill Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="rounded-xl bg-[#121216] border border-white/10 p-3">
          <span className="text-[10px] text-zinc-400 block font-medium">Gastos Mes (ARS)</span>
          <span className="text-base font-extrabold text-white mt-0.5 block">
            {formatCurrency(totalExpensesArs, 'ARS')}
          </span>
        </div>
        <div className="rounded-xl bg-[#121216] border border-white/10 p-3">
          <span className="text-[10px] text-zinc-400 block font-medium">Ingresos Mes (ARS)</span>
          <span className="text-base font-extrabold text-emerald-400 mt-0.5 block">
            {formatCurrency(totalIncomeArs, 'ARS')}
          </span>
        </div>
        <div className="rounded-xl bg-[#121216] border border-white/10 p-3">
          <span className="text-[10px] text-zinc-400 block font-medium">Gastos Mes (USD)</span>
          <span className="text-base font-extrabold text-white mt-0.5 block">
            {formatCurrency(totalExpensesUsd, 'USD')}
          </span>
        </div>
        <div className="rounded-xl bg-[#121216] border border-white/10 p-3">
          <span className="text-[10px] text-zinc-400 block font-medium">Ingresos Mes (USD)</span>
          <span className="text-base font-extrabold text-emerald-400 mt-0.5 block">
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
