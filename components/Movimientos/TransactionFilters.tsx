'use client';

import React from 'react';
import { Category, Currency, PaymentMethod, TransactionType } from '@/lib/supabase/types';
import { Search, ChevronLeft, ChevronRight, Filter } from 'lucide-react';
import { formatMonthYear } from '@/lib/utils';

interface TransactionFiltersProps {
  selectedMonth: Date;
  onMonthChange: (newMonth: Date) => void;
  currencyFilter: 'ALL' | Currency;
  onCurrencyChange: (c: 'ALL' | Currency) => void;
  typeFilter: 'ALL' | TransactionType;
  onTypeChange: (t: 'ALL' | TransactionType) => void;
  categoryFilter: string; // '' for all
  onCategoryChange: (catId: string) => void;
  paymentMethodFilter?: 'ALL' | PaymentMethod;
  onPaymentMethodChange?: (m: 'ALL' | PaymentMethod) => void;
  categories: Category[];
  searchQuery: string;
  onSearchChange: (q: string) => void;
}

export function TransactionFilters({
  selectedMonth,
  onMonthChange,
  currencyFilter,
  onCurrencyChange,
  typeFilter,
  onTypeChange,
  categoryFilter,
  onCategoryChange,
  paymentMethodFilter = 'ALL',
  onPaymentMethodChange,
  categories,
  searchQuery,
  onSearchChange,
}: TransactionFiltersProps) {
  const handlePrevMonth = () => {
    const prev = new Date(selectedMonth.getFullYear(), selectedMonth.getMonth() - 1, 1);
    onMonthChange(prev);
  };

  const handleNextMonth = () => {
    const next = new Date(selectedMonth.getFullYear(), selectedMonth.getMonth() + 1, 1);
    onMonthChange(next);
  };

  return (
    <div className="space-y-3 rounded-2xl bg-[#121216] border border-white/10 p-4 shadow-lg">
      {/* Month Navigator */}
      <div className="flex items-center justify-between bg-white/5 border border-white/5 rounded-xl px-3 py-2">
        <button
          onClick={handlePrevMonth}
          className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-white/10 transition-colors"
          title="Mes anterior"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>

        <span className="text-sm font-bold text-white tracking-wide">
          {formatMonthYear(selectedMonth)}
        </span>

        <button
          onClick={handleNextMonth}
          className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-white/10 transition-colors"
          title="Mes siguiente"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* Search Input */}
      <div className="relative">
        <Search className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          value={searchQuery}
          onChange={e => onSearchChange(e.target.value)}
          placeholder="Buscar por concepto o nota..."
          className="w-full bg-white/5 border border-white/10 rounded-xl pl-9 pr-3.5 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-emerald-500/50 transition-colors"
        />
      </div>

      {/* Filter Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
        {/* Currency Filter */}
        <div className="flex bg-white/5 p-1 rounded-xl border border-white/5">
          {(['ALL', 'ARS', 'USD'] as const).map(c => (
            <button
              key={c}
              onClick={() => onCurrencyChange(c)}
              className={`flex-1 py-1 text-xs font-semibold rounded-lg transition-all ${
                currencyFilter === c
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              {c === 'ALL' ? 'Todas' : c}
            </button>
          ))}
        </div>

        {/* Type Filter */}
        <div className="flex bg-white/5 p-1 rounded-xl border border-white/5">
          {(['ALL', 'expense', 'income'] as const).map(t => (
            <button
              key={t}
              onClick={() => onTypeChange(t)}
              className={`flex-1 py-1 text-xs font-semibold rounded-lg transition-all ${
                typeFilter === t
                  ? 'bg-white/15 text-white'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              {t === 'ALL' ? 'Todo' : t === 'expense' ? 'Gastos' : 'Ingresos'}
            </button>
          ))}
        </div>

        {/* Category Dropdown */}
        <div>
          <select
            value={categoryFilter}
            onChange={e => onCategoryChange(e.target.value)}
            className="w-full bg-zinc-900 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500/50"
          >
            <option value="">Todas las categorías</option>
            {categories.map(cat => (
              <option key={cat.id} value={cat.id}>
                {cat.name}
              </option>
            ))}
          </select>
        </div>

        {/* Payment Method Dropdown */}
        <div>
          <select
            value={paymentMethodFilter}
            onChange={e => onPaymentMethodChange?.(e.target.value as any)}
            className="w-full bg-zinc-900 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500/50"
          >
            <option value="ALL">Todos los métodos</option>
            <option value="transferencia">📱 Transferencia</option>
            <option value="tarjeta_debito">💳 Débito</option>
            <option value="tarjeta_credito">💳 Crédito</option>
            <option value="efectivo">💵 Efectivo</option>
            <option value="otro">🔄 Otro</option>
          </select>
        </div>
      </div>
    </div>
  );
}
