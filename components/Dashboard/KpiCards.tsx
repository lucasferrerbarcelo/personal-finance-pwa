'use client';

import React from 'react';
import { Transaction, DebtSummary } from '@/lib/supabase/types';
import { formatCurrency } from '@/lib/utils';
import { Wallet, TrendingUp, TrendingDown, HandCoins } from 'lucide-react';

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
    .filter(t => t.type === 'expense' && (t.currency || 'ARS') === 'ARS')
    .reduce((sum, t) => sum + Number(t.amount), 0);

  const incomeArs = monthlyTransactions
    .filter(t => t.type === 'income' && (t.currency || 'ARS') === 'ARS')
    .reduce((sum, t) => sum + Number(t.amount), 0);

  const balanceArs = incomeArs - expensesArs;

  // USD metrics
  const expensesUsd = monthlyTransactions
    .filter(t => t.type === 'expense' && t.currency === 'USD')
    .reduce((sum, t) => sum + Number(t.amount), 0);

  const incomeUsd = monthlyTransactions
    .filter(t => t.type === 'income' && t.currency === 'USD')
    .reduce((sum, t) => sum + Number(t.amount), 0);

  const balanceUsd = incomeUsd - expensesUsd;

  // Active debts summary
  const activeDebts = debts.filter(d => d.status === 'active');
  const owedToMeArs = activeDebts
    .filter(d => d.type === 'owed' && (d.currency || 'ARS') === 'ARS')
    .reduce((sum, d) => sum + Number(d.remaining_amount), 0);
  const iOweArs = activeDebts
    .filter(d => d.type === 'owe' && (d.currency || 'ARS') === 'ARS')
    .reduce((sum, d) => sum + Number(d.remaining_amount), 0);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
      {/* 1. Tarjeta Principal de Balance (Hero Card) */}
      <div className="lg:col-span-6 xl:col-span-6 bg-[#FACC15] border-2 border-black rounded-2xl shadow-[4px_4px_0px_0px_#000] p-6 text-black flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between">
            <span className="inline-block px-2.5 py-0.5 bg-black text-[#FACC15] font-mono text-[11px] font-black tracking-wider uppercase rounded-md border border-black shadow-[1px_1px_0px_0px_#000]">
              [BALANCE DISPONIBLE]
            </span>
            <span className="text-xs font-mono font-bold uppercase tracking-wider text-black/80">
              PESOS ARS
            </span>
          </div>

          <div className="text-4xl sm:text-5xl font-black font-mono tabular-nums tracking-tight text-black mt-3 mb-4">
            {formatCurrency(balanceArs, 'ARS')}
          </div>
        </div>

        {/* Dos píldoras integradas abajo */}
        <div className="flex flex-wrap items-center gap-2.5 pt-2 border-t-2 border-black/20">
          <div className="bg-[#86EFAC] border-2 border-black rounded-xl px-3.5 py-2 shadow-[2px_2px_0px_0px_#000] flex items-center gap-1.5 font-mono text-xs sm:text-sm font-black text-black">
            <span>▲ IN: {formatCurrency(incomeArs, 'ARS')}</span>
          </div>

          <div className="bg-[#FB923C] border-2 border-black rounded-xl px-3.5 py-2 shadow-[2px_2px_0px_0px_#000] flex items-center gap-1.5 font-mono text-xs sm:text-sm font-black text-black">
            <span>▼ OUT: {formatCurrency(expensesArs, 'ARS')}</span>
          </div>
        </div>
      </div>

      {/* 2. Balance USD Card */}
      <div className="lg:col-span-3 bg-white border-2 border-black rounded-2xl shadow-[3px_3px_0px_0px_#000] p-5 text-black flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between">
            <span className="inline-block px-2 py-0.5 bg-black text-white font-mono text-[10px] font-black tracking-wider uppercase rounded-md border border-black">
              [BALANCE USD]
            </span>
            <span className="text-xs font-mono font-bold text-zinc-600">DÓLARES</span>
          </div>

          <div className="text-3xl font-black font-mono tabular-nums tracking-tight text-black mt-3 mb-3">
            {formatCurrency(balanceUsd, 'USD')}
          </div>
        </div>

        <div className="space-y-1.5 pt-2 border-t-2 border-black/10">
          <div className="flex items-center justify-between bg-[#86EFAC]/40 border border-black rounded-lg px-2.5 py-1 text-xs font-mono font-bold text-black">
            <span>IN:</span>
            <span>{formatCurrency(incomeUsd, 'USD')}</span>
          </div>
          <div className="flex items-center justify-between bg-[#FB923C]/40 border border-black rounded-lg px-2.5 py-1 text-xs font-mono font-bold text-black">
            <span>OUT:</span>
            <span>{formatCurrency(expensesUsd, 'USD')}</span>
          </div>
        </div>
      </div>

      {/* 3. Deudas & Préstamos Card */}
      <div className="lg:col-span-3 bg-white border-2 border-black rounded-2xl shadow-[3px_3px_0px_0px_#000] p-5 text-black flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between">
            <span className="inline-block px-2 py-0.5 bg-black text-white font-mono text-[10px] font-black tracking-wider uppercase rounded-md border border-black">
              [DEUDAS]
            </span>
            <span className="text-[11px] font-bold text-zinc-500 font-mono">
              {activeDebts.length} activas
            </span>
          </div>

          <div className="space-y-2 mt-3 mb-2">
            <div className="bg-[#86EFAC] border-2 border-black rounded-xl p-2 shadow-[2px_2px_0px_0px_#000]">
              <div className="text-[10px] font-mono font-bold uppercase text-black/70">Me deben:</div>
              <div className="text-base font-black font-mono tabular-nums text-black">
                {formatCurrency(owedToMeArs, 'ARS')}
              </div>
            </div>

            <div className="bg-[#FB923C] border-2 border-black rounded-xl p-2 shadow-[2px_2px_0px_0px_#000]">
              <div className="text-[10px] font-mono font-bold uppercase text-black/70">Debo:</div>
              <div className="text-base font-black font-mono tabular-nums text-black">
                {formatCurrency(iOweArs, 'ARS')}
              </div>
            </div>
          </div>
        </div>

        <div className="text-[11px] font-bold text-zinc-600 pt-1 text-center font-mono">
          Neto pendiente: {formatCurrency(owedToMeArs - iOweArs, 'ARS')}
        </div>
      </div>
    </div>
  );
}
