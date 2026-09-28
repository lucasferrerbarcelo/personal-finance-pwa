'use client';

import React, { useState } from 'react';
import { PaymentMethod, Transaction } from '@/lib/supabase/types';
import { formatCurrency } from '@/lib/utils';
import { Wallet, Banknote, CreditCard, ArrowLeftRight, HelpCircle } from 'lucide-react';

interface PaymentMethodBreakdownProps {
  transactions: Transaction[];
  currentMonthStr: string; // YYYY-MM
}

interface MethodStats {
  method: PaymentMethod;
  label: string;
  icon: any;
  colorBg: string;
  colorBar: string;
  totalArs: number;
  totalUsd: number;
  count: number;
  percentage: number;
}

const METHODS_CONFIG: {
  method: PaymentMethod;
  label: string;
  icon: any;
  colorBg: string;
  colorBar: string;
}[] = [
  {
    method: 'transferencia',
    label: 'Transferencia',
    icon: ArrowLeftRight,
    colorBg: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
    colorBar: 'bg-emerald-500',
  },
  {
    method: 'tarjeta_debito',
    label: 'Tarjeta Débito',
    icon: CreditCard,
    colorBg: 'text-blue-400 bg-blue-500/10 border-blue-500/20',
    colorBar: 'bg-blue-500',
  },
  {
    method: 'tarjeta_credito',
    label: 'Tarjeta Crédito',
    icon: CreditCard,
    colorBg: 'text-purple-400 bg-purple-500/10 border-purple-500/20',
    colorBar: 'bg-purple-500',
  },
  {
    method: 'efectivo',
    label: 'Efectivo',
    icon: Banknote,
    colorBg: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
    colorBar: 'bg-amber-500',
  },
];

export function PaymentMethodBreakdown({
  transactions,
  currentMonthStr,
}: PaymentMethodBreakdownProps) {
  const [selectedCurrency, setSelectedCurrency] = useState<'ARS' | 'USD'>('ARS');

  // Filter expenses for current month
  const monthExpenses = transactions.filter(
    tx => tx.type === 'expense' && tx.date.startsWith(currentMonthStr)
  );

  const totalExpenseArs = monthExpenses
    .filter(t => t.currency === 'ARS')
    .reduce((sum, t) => sum + Number(t.amount), 0);

  const totalExpenseUsd = monthExpenses
    .filter(t => t.currency === 'USD')
    .reduce((sum, t) => sum + Number(t.amount), 0);

  const activeTotal = selectedCurrency === 'ARS' ? totalExpenseArs : totalExpenseUsd;

  const stats: MethodStats[] = METHODS_CONFIG.map(cfg => {
    const txs = monthExpenses.filter(t => (t.payment_method || 'transferencia') === cfg.method);
    const ars = txs
      .filter(t => t.currency === 'ARS')
      .reduce((sum, t) => sum + Number(t.amount), 0);
    const usd = txs
      .filter(t => t.currency === 'USD')
      .reduce((sum, t) => sum + Number(t.amount), 0);

    const relevantAmount = selectedCurrency === 'ARS' ? ars : usd;
    const percentage = activeTotal > 0 ? (relevantAmount / activeTotal) * 100 : 0;

    return {
      ...cfg,
      totalArs: ars,
      totalUsd: usd,
      count: txs.length,
      percentage,
    };
  });

  return (
    <div className="rounded-2xl bg-[#121216] border border-white/10 p-5 shadow-lg">
      {/* Header */}
      <div className="flex items-center justify-between pb-4 border-b border-white/5">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400">
            <Wallet className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white tracking-tight">Métodos de Pago</h3>
            <p className="text-xs text-zinc-400">Distribución de gastos del mes</p>
          </div>
        </div>

        {/* Currency Switcher */}
        <div className="flex bg-white/5 p-0.5 rounded-lg border border-white/5 text-[11px]">
          <button
            onClick={() => setSelectedCurrency('ARS')}
            className={`px-2 py-1 font-semibold rounded-md transition-all ${
              selectedCurrency === 'ARS'
                ? 'bg-emerald-500 text-black shadow-sm'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            ARS
          </button>
          <button
            onClick={() => setSelectedCurrency('USD')}
            className={`px-2 py-1 font-semibold rounded-md transition-all ${
              selectedCurrency === 'USD'
                ? 'bg-emerald-500 text-black shadow-sm'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            USD
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="mt-4 space-y-3.5">
        {activeTotal === 0 ? (
          <div className="py-6 text-center text-xs text-zinc-500">
            No hay gastos registrados en {selectedCurrency} este mes.
          </div>
        ) : (
          stats.map(item => {
            const Icon = item.icon;
            const amount = selectedCurrency === 'ARS' ? item.totalArs : item.totalUsd;

            return (
              <div key={item.method} className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <div
                      className={`p-1 rounded-md border text-xs flex items-center justify-center ${item.colorBg}`}
                    >
                      <Icon className="w-3 h-3" />
                    </div>
                    <span className="font-semibold text-zinc-200">{item.label}</span>
                    <span className="text-[10px] text-zinc-400">({item.count} movs)</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="font-bold text-white">
                      {formatCurrency(amount, selectedCurrency)}
                    </span>
                    <span className="text-[11px] font-medium text-zinc-400 w-10 text-right">
                      {item.percentage.toFixed(0)}%
                    </span>
                  </div>
                </div>

                {/* Progress bar */}
                <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
                  <div
                    className={`h-full ${item.colorBar} rounded-full transition-all duration-500`}
                    style={{ width: `${Math.min(100, item.percentage)}%` }}
                  />
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
