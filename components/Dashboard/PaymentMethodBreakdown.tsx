'use client';

import React, { useState } from 'react';
import { PaymentMethod, Transaction } from '@/lib/supabase/types';
import { formatCurrency } from '@/lib/utils';
import { Banknote, CreditCard, ArrowLeftRight } from 'lucide-react';

interface PaymentMethodBreakdownProps {
  transactions: Transaction[];
  currentMonthStr: string; // YYYY-MM
}

interface MethodCardConfig {
  method: PaymentMethod;
  label: string;
  icon: any;
  bgColor: string;
}

const METHODS: MethodCardConfig[] = [
  {
    method: 'transferencia',
    label: 'Transferencia / MP',
    icon: ArrowLeftRight,
    bgColor: 'bg-[#60A5FA]', // azul cobalto
  },
  {
    method: 'tarjeta_debito',
    label: 'Débito',
    icon: CreditCard,
    bgColor: 'bg-[#FB923C]', // naranja pastel / terracota
  },
  {
    method: 'efectivo',
    label: 'Efectivo',
    icon: Banknote,
    bgColor: 'bg-[#FEF08A]', // amarillo pálido
  },
  {
    method: 'tarjeta_credito',
    label: 'Crédito',
    icon: CreditCard,
    bgColor: 'bg-[#C084FC]', // lila pastel
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
    .filter(t => (t.currency || 'ARS') === 'ARS')
    .reduce((sum, t) => sum + Number(t.amount), 0);

  const totalExpenseUsd = monthExpenses
    .filter(t => t.currency === 'USD')
    .reduce((sum, t) => sum + Number(t.amount), 0);

  const activeTotal = selectedCurrency === 'ARS' ? totalExpenseArs : totalExpenseUsd;

  return (
    <div className="bg-white border-2 border-black rounded-2xl shadow-[3px_3px_0px_0px_#000] p-5 text-black">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 pb-4 border-b-2 border-black/10">
        <div>
          <span className="inline-block px-2 py-0.5 bg-black text-white font-mono text-[10px] font-black tracking-wider uppercase rounded-md border border-black mb-1">
            [MÉTODOS DE PAGO]
          </span>
          <h3 className="text-base font-black tracking-tight text-black">Distribución de Gastos</h3>
        </div>

        {/* Currency Switcher */}
        <div className="flex gap-1 bg-[#F4F1EA] p-1 rounded-xl border-2 border-black shadow-[2px_2px_0px_0px_#000]">
          <button
            onClick={() => setSelectedCurrency('ARS')}
            className={`px-3 py-1 font-mono text-xs font-black rounded-lg transition-all ${
              selectedCurrency === 'ARS'
                ? 'bg-[#FACC15] text-black border border-black shadow-[1px_1px_0px_0px_#000]'
                : 'text-zinc-600 hover:text-black'
            }`}
          >
            ARS
          </button>
          <button
            onClick={() => setSelectedCurrency('USD')}
            className={`px-3 py-1 font-mono text-xs font-black rounded-lg transition-all ${
              selectedCurrency === 'USD'
                ? 'bg-[#FACC15] text-black border border-black shadow-[1px_1px_0px_0px_#000]'
                : 'text-zinc-600 hover:text-black'
            }`}
          >
            USD
          </button>
        </div>
      </div>

      {/* Grid of Method Pills / Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4">
        {METHODS.map(cfg => {
          const Icon = cfg.icon;
          const methodTxs = monthExpenses.filter(
            t => (t.payment_method || 'transferencia') === cfg.method
          );
          const amount = methodTxs
            .filter(t => (selectedCurrency === 'ARS' ? (t.currency || 'ARS') === 'ARS' : t.currency === 'USD'))
            .reduce((sum, t) => sum + Number(t.amount), 0);

          const pct = activeTotal > 0 ? (amount / activeTotal) * 100 : 0;

          return (
            <div
              key={cfg.method}
              className={`${cfg.bgColor} border-2 border-black rounded-xl p-3.5 shadow-[2px_2px_0px_0px_#000] text-black flex flex-col justify-between`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 bg-white border-2 border-black rounded-lg flex items-center justify-center shadow-[1px_1px_0px_0px_#000]">
                    <Icon className="w-4 h-4 text-black stroke-[2.5px]" />
                  </div>
                  <span className="font-black text-xs tracking-tight">{cfg.label}</span>
                </div>
                <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 bg-black text-white rounded border border-black">
                  {methodTxs.length}
                </span>
              </div>

              <div className="mt-3">
                <div className="flex items-baseline justify-between">
                  <span className="text-lg font-black font-mono tabular-nums text-black">
                    {formatCurrency(amount, selectedCurrency)}
                  </span>
                  <span className="text-xs font-mono font-black text-black/80">
                    {pct.toFixed(0)}%
                  </span>
                </div>

                {/* Progress bar inside card */}
                <div className="w-full h-2.5 bg-black/15 border border-black rounded-full overflow-hidden mt-1.5 p-0.5">
                  <div
                    className="h-full bg-black rounded-full transition-all duration-500"
                    style={{ width: `${Math.min(100, Math.max(0, pct))}%` }}
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
