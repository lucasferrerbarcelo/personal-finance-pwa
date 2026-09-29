'use client';

import React from 'react';
import { Category, Currency, PaymentMethod, TransactionType } from '@/lib/supabase/types';
import { Search, ChevronLeft, ChevronRight } from 'lucide-react';
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
    <div className="space-y-3.5 bg-white border-2 border-black rounded-2xl shadow-[3px_3px_0px_0px_#000] p-4 text-black">
      {/* Month Navigator */}
      <div className="flex items-center justify-between bg-[#FACC15] border-2 border-black rounded-xl px-3.5 py-2 shadow-[2px_2px_0px_0px_#000]">
        <button
          onClick={handlePrevMonth}
          className="p-1.5 rounded-lg bg-white border-2 border-black text-black hover:bg-black hover:text-white shadow-[1px_1px_0px_0px_#000] transition-colors active:translate-x-[1px] active:translate-y-[1px]"
          title="Mes anterior"
        >
          <ChevronLeft className="w-4 h-4 stroke-[3px]" />
        </button>

        <span className="text-sm font-black font-mono tracking-wider text-black uppercase">
          [{formatMonthYear(selectedMonth)}]
        </span>

        <button
          onClick={handleNextMonth}
          className="p-1.5 rounded-lg bg-white border-2 border-black text-black hover:bg-black hover:text-white shadow-[1px_1px_0px_0px_#000] transition-colors active:translate-x-[1px] active:translate-y-[1px]"
          title="Mes siguiente"
        >
          <ChevronRight className="w-4 h-4 stroke-[3px]" />
        </button>
      </div>

      {/* Search Input */}
      <div className="relative">
        <Search className="w-4 h-4 text-black absolute left-3.5 top-1/2 -translate-y-1/2 stroke-[2.5px]" />
        <input
          type="text"
          value={searchQuery}
          onChange={e => onSearchChange(e.target.value)}
          placeholder="Buscar por concepto o nota..."
          className="w-full bg-[#F4F1EA] border-2 border-black rounded-xl pl-9 pr-3.5 py-2 text-xs font-bold text-black placeholder:text-zinc-500 shadow-[2px_2px_0px_0px_#000] focus:outline-none"
        />
      </div>

      {/* Filter Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
        {/* Currency Filter */}
        <div className="flex bg-[#F4F1EA] p-1 rounded-xl border-2 border-black shadow-[2px_2px_0px_0px_#000]">
          {(['ALL', 'ARS', 'USD'] as const).map(c => (
            <button
              key={c}
              onClick={() => onCurrencyChange(c)}
              className={`flex-1 py-1 text-xs font-mono font-black rounded-lg transition-all ${
                currencyFilter === c
                  ? 'bg-[#86EFAC] text-black border-2 border-black shadow-[1px_1px_0px_0px_#000]'
                  : 'text-zinc-600 hover:text-black'
              }`}
            >
              {c === 'ALL' ? 'TODAS' : c}
            </button>
          ))}
        </div>

        {/* Type Filter */}
        <div className="flex bg-[#F4F1EA] p-1 rounded-xl border-2 border-black shadow-[2px_2px_0px_0px_#000]">
          {(['ALL', 'expense', 'income'] as const).map(t => (
            <button
              key={t}
              onClick={() => onTypeChange(t)}
              className={`flex-1 py-1 text-xs font-mono font-black rounded-lg transition-all ${
                typeFilter === t
                  ? 'bg-[#FACC15] text-black border-2 border-black shadow-[1px_1px_0px_0px_#000]'
                  : 'text-zinc-600 hover:text-black'
              }`}
            >
              {t === 'ALL' ? 'TODO' : t === 'expense' ? 'GASTOS' : 'INGRESOS'}
            </button>
          ))}
        </div>

        {/* Category Dropdown */}
        <div>
          <select
            value={categoryFilter}
            onChange={e => onCategoryChange(e.target.value)}
            className="w-full bg-[#F4F1EA] border-2 border-black rounded-xl px-3 py-2 text-xs font-bold text-black shadow-[2px_2px_0px_0px_#000] focus:outline-none"
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
            className="w-full bg-[#F4F1EA] border-2 border-black rounded-xl px-3 py-2 text-xs font-bold text-black shadow-[2px_2px_0px_0px_#000] focus:outline-none"
          >
            <option value="ALL">Todos los métodos</option>
            <option value="transferencia">📱 Transferencia / MP</option>
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
