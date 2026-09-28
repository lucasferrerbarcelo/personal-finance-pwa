'use client';

import React from 'react';
import { Transaction } from '@/lib/supabase/types';
import { formatCurrency, formatMonthYear } from '@/lib/utils';
import { CategoryIcon } from '../UI/CategoryIcon';
import { CurrencyBadge } from '../UI/CurrencyBadge';
import { CreditCard, Calendar, CheckCircle2 } from 'lucide-react';

interface MonthlyInstallmentsProps {
  transactions: Transaction[];
  baseDate?: Date;
}

export function MonthlyInstallments({ transactions, baseDate = new Date() }: MonthlyInstallmentsProps) {
  // Generate 6 months
  const months = [];
  for (let i = 0; i < 6; i++) {
    const d = new Date(baseDate.getFullYear(), baseDate.getMonth() + i, 1);
    const year = d.getFullYear();
    const monthNum = String(d.getMonth() + 1).padStart(2, '0');
    const prefix = `${year}-${monthNum}`;
    const label = formatMonthYear(d);

    const items = transactions.filter(
      t =>
        t.date.startsWith(prefix) &&
        t.type === 'expense' &&
        t.installment_total &&
        t.installment_total > 1
    );

    const totalArs = items
      .filter(t => t.currency === 'ARS')
      .reduce((sum, t) => sum + Number(t.amount), 0);

    const totalUsd = items
      .filter(t => t.currency === 'USD')
      .reduce((sum, t) => sum + Number(t.amount), 0);

    months.push({
      prefix,
      label,
      isCurrent: i === 0,
      items,
      totalArs,
      totalUsd,
    });
  }

  return (
    <div className="space-y-4">
      {months.map(m => {
        return (
          <div
            key={m.prefix}
            className={`rounded-2xl bg-[#121216] border overflow-hidden shadow-lg transition-all ${
              m.isCurrent ? 'border-purple-500/30' : 'border-white/10'
            }`}
          >
            {/* Month Header */}
            <div
              className={`px-4 py-3 border-b flex flex-wrap items-center justify-between gap-2 ${
                m.isCurrent
                  ? 'bg-purple-950/20 border-purple-500/20'
                  : 'bg-white/[0.03] border-white/5'
              }`}
            >
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-white">{m.label}</span>
                {m.isCurrent && (
                  <span className="text-[10px] font-semibold bg-purple-500/20 text-purple-300 px-2 py-0.5 rounded-full">
                    Mes en curso
                  </span>
                )}
                <span className="text-xs text-zinc-400">
                  ({m.items.length} {m.items.length === 1 ? 'cuota' : 'cuotas'})
                </span>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs text-zinc-400">Total a pagar:</span>
                <span className="text-sm font-extrabold text-white">
                  {formatCurrency(m.totalArs, 'ARS')}
                </span>
                {m.totalUsd > 0 && (
                  <span className="text-xs font-bold text-emerald-400">
                    + {formatCurrency(m.totalUsd, 'USD')}
                  </span>
                )}
              </div>
            </div>

            {/* Itemized List */}
            {m.items.length === 0 ? (
              <div className="p-4 text-center text-xs text-zinc-500 italic">
                Sin cuotas comprometidas para este mes.
              </div>
            ) : (
              <div className="divide-y divide-white/5">
                {m.items.map(item => (
                  <div
                    key={item.id}
                    className="p-3.5 flex items-center justify-between gap-3 hover:bg-white/[0.02] transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <CategoryIcon
                        name={item.category?.icon}
                        color={item.category?.color}
                        size={18}
                        className="w-10 h-10"
                      />
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-white truncate">
                          {item.note || item.category?.name || 'Compra en cuotas'}
                        </p>
                        <div className="flex items-center gap-2 mt-0.5 text-[11px] text-zinc-400">
                          <span>{item.category?.name || 'General'}</span>
                          <span className="inline-flex items-center gap-1 text-[10px] text-purple-300 bg-purple-500/10 px-1.5 py-0.5 rounded border border-purple-500/20">
                            <CreditCard className="w-2.5 h-2.5" />
                            Cuota {item.installment_current} de {item.installment_total}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <p className="text-xs font-bold text-white">
                        {formatCurrency(item.amount, item.currency)}
                      </p>
                      <CurrencyBadge currency={item.currency} className="mt-0.5 text-[10px]" />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
