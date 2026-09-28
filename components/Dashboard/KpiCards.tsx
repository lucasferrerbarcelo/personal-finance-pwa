'use client';

import React from 'react';
import { Transaction, DebtSummary } from '@/lib/supabase/types';
import { formatCurrency } from '@/lib/utils';
import { TrendingDown, TrendingUp, Wallet, HandCoins } from 'lucide-react';

interface KpiCardsProps {
  transactions: Transaction[];
  debts: DebtSummary[];
  currentMonthStr: string; // YYYY-MM
}

export function KpiCards({ transactions, debts, currentMonthStr }: KpiCardsProps) {
  // Filter transactions for this month
  const monthlyTransactions = transactions.filter(t => t.date.startsWith(currentMonthStr));

  // ARS metrics
  const expensesArs = monthlyTransactions
    .filter(t => t.type === 'expense' && t.currency === 'ARS')
    .reduce((sum, t) => sum + Number(t.amount), 0);

  const incomeArs = monthlyTransactions
    .filter(t => t.type === 'income' && t.currency === 'ARS')
    .reduce((sum, t) => sum + Number(t.amount), 0);

  // USD metrics
  const expensesUsd = monthlyTransactions
    .filter(t => t.type === 'expense' && t.currency === 'USD')
    .reduce((sum, t) => sum + Number(t.amount), 0);

  const incomeUsd = monthlyTransactions
    .filter(t => t.type === 'income' && t.currency === 'USD')
    .reduce((sum, t) => sum + Number(t.amount), 0);

  // Active debts summary
  const activeDebts = debts.filter(d => d.status === 'active');
  const owedToMeArs = activeDebts
    .filter(d => d.type === 'owed' && d.currency === 'ARS')
    .reduce((sum, d) => sum + Number(d.remaining_amount), 0);
  const iOweArs = activeDebts
    .filter(d => d.type === 'owe' && d.currency === 'ARS')
    .reduce((sum, d) => sum + Number(d.remaining_amount), 0);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
      {/* 1. Total Gastos Mes ARS */}
      <div className="relative overflow-hidden rounded-2xl bg-[#121216] border border-white/10 p-4 shadow-lg hover:border-rose-500/30 transition-all">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-zinc-400">Gastos Mes (ARS)</span>
          <div className="p-2 rounded-xl bg-rose-500/10 text-rose-400">
            <TrendingDown className="w-4 h-4" />
          </div>
        </div>
        <div className="mt-3">
          <h3 className="text-2xl font-black tracking-tight text-white">
            {formatCurrency(expensesArs, 'ARS')}
          </h3>
          <p className="text-[11px] text-zinc-400 mt-1 flex items-center gap-1">
            <span>Ingresos:</span>
            <span className="text-emerald-400 font-medium">{formatCurrency(incomeArs, 'ARS')}</span>
          </p>
        </div>
        <div className="absolute -right-4 -bottom-4 w-20 h-20 rounded-full bg-rose-500/5 blur-2xl pointer-events-none" />
      </div>

      {/* 2. Total Gastos Mes USD */}
      <div className="relative overflow-hidden rounded-2xl bg-[#121216] border border-white/10 p-4 shadow-lg hover:border-emerald-500/30 transition-all">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-zinc-400">Gastos Mes (USD)</span>
          <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400">
            <TrendingDown className="w-4 h-4" />
          </div>
        </div>
        <div className="mt-3">
          <h3 className="text-2xl font-black tracking-tight text-emerald-400">
            {formatCurrency(expensesUsd, 'USD')}
          </h3>
          <p className="text-[11px] text-zinc-400 mt-1 flex items-center gap-1">
            <span>Ingresos:</span>
            <span className="text-emerald-300 font-medium">{formatCurrency(incomeUsd, 'USD')}</span>
          </p>
        </div>
        <div className="absolute -right-4 -bottom-4 w-20 h-20 rounded-full bg-emerald-500/5 blur-2xl pointer-events-none" />
      </div>

      {/* 3. Balance Neto ARS */}
      <div className="relative overflow-hidden rounded-2xl bg-[#121216] border border-white/10 p-4 shadow-lg hover:border-sky-500/30 transition-all">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-zinc-400">Balance Neto Mes</span>
          <div className="p-2 rounded-xl bg-sky-500/10 text-sky-400">
            <Wallet className="w-4 h-4" />
          </div>
        </div>
        <div className="mt-3">
          <h3
            className={`text-2xl font-black tracking-tight ${
              incomeArs - expensesArs >= 0 ? 'text-white' : 'text-rose-400'
            }`}
          >
            {formatCurrency(incomeArs - expensesArs, 'ARS')}
          </h3>
          <p className="text-[11px] text-zinc-400 mt-1">
            {incomeArs >= expensesArs ? '✅ Flujo positivo este mes' : '⚠️ Gastos superan ingresos'}
          </p>
        </div>
        <div className="absolute -right-4 -bottom-4 w-20 h-20 rounded-full bg-sky-500/5 blur-2xl pointer-events-none" />
      </div>

      {/* 4. Deudas Activas */}
      <div className="relative overflow-hidden rounded-2xl bg-[#121216] border border-white/10 p-4 shadow-lg hover:border-amber-500/30 transition-all">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-zinc-400">Deudas & Préstamos</span>
          <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400">
            <HandCoins className="w-4 h-4" />
          </div>
        </div>
        <div className="mt-3">
          <div className="flex items-center justify-between text-xs">
            <span className="text-zinc-400">Me deben:</span>
            <span className="font-bold text-emerald-400">{formatCurrency(owedToMeArs, 'ARS')}</span>
          </div>
          <div className="flex items-center justify-between text-xs mt-1.5">
            <span className="text-zinc-400">Debo:</span>
            <span className="font-bold text-rose-400">{formatCurrency(iOweArs, 'ARS')}</span>
          </div>
          <div className="mt-2 pt-2 border-t border-white/5 flex items-center justify-between text-[11px]">
            <span className="text-zinc-400">Activas:</span>
            <span className="text-zinc-300 font-semibold">{activeDebts.length} registradas</span>
          </div>
        </div>
      </div>
    </div>
  );
}
