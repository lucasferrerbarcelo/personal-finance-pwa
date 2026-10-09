'use client';

import React from 'react';
import Link from 'next/link';
import { Transaction, DebtSummary } from '@/lib/supabase/types';
import { formatCurrency } from '@/lib/utils';
import { useTheme } from '@/lib/theme/ThemeContext';

interface KpiCardsProps {
  transactions: Transaction[];
  debts: DebtSummary[];
  currentMonthStr: string; // YYYY-MM
}

export function KpiCards({ transactions, debts, currentMonthStr }: KpiCardsProps) {
  const { isMinimal } = useTheme();

  // Filter transactions for this month
  const monthlyTransactions = transactions.filter(t => t.date.startsWith(currentMonthStr));

  // ARS metrics:
  // Liquid cash balance does NOT discount credit card expenses immediately
  const cashExpensesArs = monthlyTransactions
    .filter(t => t.type === 'expense' && (t.currency || 'ARS') === 'ARS' && t.payment_method !== 'tarjeta_credito')
    .reduce((sum, t) => sum + Number(t.amount), 0);

  const creditCardExpensesArs = monthlyTransactions
    .filter(t => t.type === 'expense' && (t.currency || 'ARS') === 'ARS' && t.payment_method === 'tarjeta_credito')
    .reduce((sum, t) => sum + Number(t.amount), 0);

  const incomeArs = monthlyTransactions
    .filter(t => t.type === 'income' && (t.currency || 'ARS') === 'ARS')
    .reduce((sum, t) => sum + Number(t.amount), 0);

  const balanceArs = incomeArs - cashExpensesArs;

  // USD metrics
  const cashExpensesUsd = monthlyTransactions
    .filter(t => t.type === 'expense' && t.currency === 'USD' && t.payment_method !== 'tarjeta_credito')
    .reduce((sum, t) => sum + Number(t.amount), 0);

  const incomeUsd = monthlyTransactions
    .filter(t => t.type === 'income' && t.currency === 'USD')
    .reduce((sum, t) => sum + Number(t.amount), 0);

  const balanceUsd = incomeUsd - cashExpensesUsd;

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
      <div
        className={`lg:col-span-6 xl:col-span-6 rounded-2xl p-6 flex flex-col justify-between transition-all ${
          isMinimal
            ? 'bg-white border border-zinc-200 shadow-sm text-zinc-900'
            : 'bg-[#FACC15] border-2 border-black shadow-[4px_4px_0px_0px_#000] text-black'
        }`}
      >
        <div>
          <div className="flex items-center justify-between">
            {isMinimal ? (
              <span className="inline-block px-2.5 py-0.5 bg-zinc-100 text-zinc-600 font-sans text-xs font-semibold tracking-wider uppercase rounded-md border border-zinc-200/80">
                Balance Disponible
              </span>
            ) : (
              <span className="inline-block px-2.5 py-0.5 bg-black text-[#FACC15] font-mono text-[11px] font-black tracking-wider uppercase rounded-md border border-black shadow-[1px_1px_0px_0px_#000]">
                [BALANCE DISPONIBLE]
              </span>
            )}
            <span
              className={`text-xs uppercase tracking-wider ${
                isMinimal ? 'font-sans font-medium text-zinc-400' : 'font-mono font-bold text-black/80'
              }`}
            >
              Pesos ARS
            </span>
          </div>

          <div
            className={`mt-3 mb-4 tabular-nums tracking-tight ${
              isMinimal
                ? 'text-4xl sm:text-5xl font-bold font-sans text-zinc-950'
                : 'text-4xl sm:text-5xl font-black font-mono text-black'
            }`}
          >
            {formatCurrency(balanceArs, 'ARS')}
          </div>
        </div>

        {/* Dos píldoras integradas abajo */}
        <div
          className={`flex flex-wrap items-center gap-2.5 pt-2 ${
            isMinimal ? 'border-t border-zinc-100' : 'border-t-2 border-black/20'
          }`}
        >
          {isMinimal ? (
            <>
              <div className="bg-emerald-50 border border-emerald-200/80 rounded-lg px-3 py-1.5 flex items-center gap-1.5 font-medium text-xs sm:text-sm text-emerald-700">
                <span>▲ IN: {formatCurrency(incomeArs, 'ARS')}</span>
              </div>
              <div
                className="bg-zinc-100/90 border border-zinc-200/80 rounded-lg px-3 py-1.5 flex items-center gap-1.5 font-medium text-xs sm:text-sm text-zinc-700"
                title={creditCardExpensesArs > 0 ? `Gastos reales de caja. Tarjeta de crédito diferida: ${formatCurrency(creditCardExpensesArs, 'ARS')}` : undefined}
              >
                <span>▼ OUT (Caja): {formatCurrency(cashExpensesArs, 'ARS')}</span>
              </div>
            </>
          ) : (
            <>
              <div className="bg-[#86EFAC] border-2 border-black rounded-xl px-3.5 py-2 shadow-[2px_2px_0px_0px_#000] flex items-center gap-1.5 font-mono text-xs sm:text-sm font-black text-black">
                <span>▲ IN: {formatCurrency(incomeArs, 'ARS')}</span>
              </div>
              <div
                className="bg-[#FB923C] border-2 border-black rounded-xl px-3.5 py-2 shadow-[2px_2px_0px_0px_#000] flex items-center gap-1.5 font-mono text-xs sm:text-sm font-black text-black"
                title={creditCardExpensesArs > 0 ? `Gastos reales de caja. Tarjeta de crédito diferida: ${formatCurrency(creditCardExpensesArs, 'ARS')}` : undefined}
              >
                <span>▼ OUT (Caja): {formatCurrency(cashExpensesArs, 'ARS')}</span>
              </div>
            </>
          )}
        </div>
      </div>

      {/* 2. Balance USD Card */}
      <div
        className={`lg:col-span-3 rounded-2xl p-5 flex flex-col justify-between transition-all ${
          isMinimal
            ? 'bg-white border border-zinc-200 shadow-sm text-zinc-900'
            : 'bg-white border-2 border-black shadow-[3px_3px_0px_0px_#000] text-black'
        }`}
      >
        <div>
          <div className="flex items-center justify-between">
            {isMinimal ? (
              <span className="inline-block px-2 py-0.5 bg-zinc-100 text-zinc-600 font-sans text-xs font-semibold tracking-wider uppercase rounded-md border border-zinc-200/80">
                Balance USD
              </span>
            ) : (
              <span className="inline-block px-2 py-0.5 bg-black text-white font-mono text-[10px] font-black tracking-wider uppercase rounded-md border border-black">
                [BALANCE USD]
              </span>
            )}
            <span
              className={`text-xs ${
                isMinimal ? 'font-sans font-medium text-zinc-400' : 'font-mono font-bold text-zinc-600'
              }`}
            >
              DÓLARES
            </span>
          </div>

          <div
            className={`mt-3 mb-3 tabular-nums tracking-tight ${
              isMinimal
                ? 'text-3xl font-bold font-sans text-zinc-950'
                : 'text-3xl font-black font-mono text-black'
            }`}
          >
            {formatCurrency(balanceUsd, 'USD')}
          </div>
        </div>

        <div
          className={`space-y-1.5 pt-2 ${
            isMinimal ? 'border-t border-zinc-100' : 'border-t-2 border-black/10'
          }`}
        >
          {isMinimal ? (
            <>
              <div className="flex items-center justify-between bg-emerald-50/70 border border-emerald-200/50 rounded-lg px-2.5 py-1 text-xs font-medium text-emerald-800">
                <span>IN:</span>
                <span>{formatCurrency(incomeUsd, 'USD')}</span>
              </div>
              <div className="flex items-center justify-between bg-zinc-100/70 border border-zinc-200/50 rounded-lg px-2.5 py-1 text-xs font-medium text-zinc-700">
                <span>OUT:</span>
                <span>{formatCurrency(cashExpensesUsd, 'USD')}</span>
              </div>
            </>
          ) : (
            <>
              <div className="flex items-center justify-between bg-[#86EFAC]/40 border border-black rounded-lg px-2.5 py-1 text-xs font-mono font-bold text-black">
                <span>IN:</span>
                <span>{formatCurrency(incomeUsd, 'USD')}</span>
              </div>
              <div className="flex items-center justify-between bg-[#FB923C]/40 border border-black rounded-lg px-2.5 py-1 text-xs font-mono font-bold text-black">
                <span>OUT:</span>
                <span>{formatCurrency(cashExpensesUsd, 'USD')}</span>
              </div>
            </>
          )}
        </div>
      </div>

      {/* 3. Deudas & Préstamos Card */}
      <div
        className={`lg:col-span-3 rounded-2xl p-5 flex flex-col justify-between transition-all ${
          isMinimal
            ? 'bg-white border border-zinc-200 shadow-sm text-zinc-900'
            : 'bg-white border-2 border-black shadow-[3px_3px_0px_0px_#000] text-black'
        }`}
      >
        <div>
          <div className="flex items-center justify-between">
            {isMinimal ? (
              <span className="inline-block px-2 py-0.5 bg-zinc-100 text-zinc-600 font-sans text-xs font-semibold tracking-wider uppercase rounded-md border border-zinc-200/80">
                Deudas
              </span>
            ) : (
              <span className="inline-block px-2 py-0.5 bg-black text-white font-mono text-[10px] font-black tracking-wider uppercase rounded-md border border-black">
                [DEUDAS]
              </span>
            )}
            <Link
              href="/deudas"
              className={`text-[11px] underline hover:opacity-75 ${
                isMinimal ? 'font-medium text-zinc-500' : 'font-black text-black font-mono decoration-2'
              }`}
            >
              Ver {activeDebts.length} activas →
            </Link>
          </div>

          <div className="space-y-2 mt-3 mb-2">
            {isMinimal ? (
              <>
                <Link
                  href="/deudas"
                  className="block bg-emerald-50/70 hover:bg-emerald-100/70 border border-emerald-200/80 rounded-xl p-2.5 transition-all"
                  title="Ir a Deudas a cobrar"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-medium uppercase text-emerald-800">Me deben:</span>
                    <span className="text-[10px] font-medium text-emerald-700">Ver →</span>
                  </div>
                  <div className="text-base font-bold font-sans tabular-nums text-emerald-950 mt-0.5">
                    {formatCurrency(owedToMeArs, 'ARS')}
                  </div>
                </Link>

                <Link
                  href="/deudas"
                  className="block bg-amber-50/70 hover:bg-amber-100/70 border border-amber-200/80 rounded-xl p-2.5 transition-all"
                  title="Ir a Deudas a pagar"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-medium uppercase text-amber-800">Debo:</span>
                    <span className="text-[10px] font-medium text-amber-700">Ver →</span>
                  </div>
                  <div className="text-base font-bold font-sans tabular-nums text-amber-950 mt-0.5">
                    {formatCurrency(iOweArs, 'ARS')}
                  </div>
                </Link>
              </>
            ) : (
              <>
                <Link
                  href="/deudas"
                  className="block bg-[#86EFAC] hover:bg-[#4ade80] border-2 border-black rounded-xl p-2 shadow-[2px_2px_0px_0px_#000] transition-all active:translate-x-[1px] active:translate-y-[1px]"
                  title="Ir a Deudas a cobrar"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono font-bold uppercase text-black/70">Me deben:</span>
                    <span className="text-[10px] font-mono font-black text-black">Ver / Borrar →</span>
                  </div>
                  <div className="text-base font-black font-mono tabular-nums text-black">
                    {formatCurrency(owedToMeArs, 'ARS')}
                  </div>
                </Link>

                <Link
                  href="/deudas"
                  className="block bg-[#FB923C] hover:bg-[#f97316] border-2 border-black rounded-xl p-2 shadow-[2px_2px_0px_0px_#000] transition-all active:translate-x-[1px] active:translate-y-[1px]"
                  title="Ir a Deudas a pagar"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono font-bold uppercase text-black/70">Debo:</span>
                    <span className="text-[10px] font-mono font-black text-black">Ver / Borrar →</span>
                  </div>
                  <div className="text-base font-black font-mono tabular-nums text-black">
                    {formatCurrency(iOweArs, 'ARS')}
                  </div>
                </Link>
              </>
            )}
          </div>
        </div>

        <div
          className={`pt-2 flex items-center justify-between ${
            isMinimal ? 'border-t border-zinc-100' : 'border-t-2 border-black/10'
          }`}
        >
          <span
            className={`text-[11px] ${
              isMinimal ? 'font-medium text-zinc-500' : 'font-bold text-zinc-600 font-mono'
            }`}
          >
            Neto: {formatCurrency(owedToMeArs - iOweArs, 'ARS')}
          </span>
          <Link
            href="/deudas"
            className={`text-[11px] px-2.5 py-1 rounded transition-colors ${
              isMinimal
                ? 'bg-zinc-100 hover:bg-zinc-200 text-zinc-800 font-medium border border-zinc-200/60'
                : 'font-mono font-black text-black bg-[#F4F1EA] hover:bg-zinc-200 border border-black shadow-[1px_1px_0px_0px_#000]'
            }`}
          >
            Gestionar deudas →
          </Link>
        </div>
      </div>
    </div>
  );
}
