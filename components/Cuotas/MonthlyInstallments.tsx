'use client';

import React from 'react';
import { Transaction } from '@/lib/supabase/types';
import { formatCurrency, formatMonthYear } from '@/lib/utils';
import { CategoryIcon } from '../UI/CategoryIcon';
import { CreditCard } from 'lucide-react';

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
            className="rounded-2xl bg-white border-2 border-black overflow-hidden shadow-[3px_3px_0px_0px_#000]"
          >
            {/* Month Header */}
            <div
              className={`px-4 py-3 border-b-2 border-black flex flex-wrap items-center justify-between gap-2 ${
                m.isCurrent ? 'bg-[#FEF08A]' : 'bg-[#F4F1EA]'
              }`}
            >
              <div className="flex items-center gap-2">
                <span className="font-mono font-black text-sm text-black uppercase tracking-wider">{m.label}</span>
                {m.isCurrent && (
                  <span className="text-[10px] font-mono font-black bg-black text-white px-2 py-0.5 rounded border border-black">
                    MES EN CURSO
                  </span>
                )}
                <span className="text-xs font-mono font-bold text-zinc-600">
                  ({m.items.length} {m.items.length === 1 ? 'cuota' : 'cuotas'})
                </span>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs font-mono font-bold text-zinc-600">Total a pagar:</span>
                <span className="text-sm font-mono font-black tabular-nums text-black">
                  {formatCurrency(m.totalArs, 'ARS')}
                </span>
                {m.totalUsd > 0 && (
                  <span className="text-xs font-mono font-bold text-emerald-800 tabular-nums">
                    + {formatCurrency(m.totalUsd, 'USD')}
                  </span>
                )}
              </div>
            </div>

            {/* Itemized List */}
            {m.items.length === 0 ? (
              <div className="p-5 text-center text-xs font-mono font-bold text-zinc-500 italic bg-white">
                Sin cuotas comprometidas para este mes.
              </div>
            ) : (
              <div className="divide-y-2 divide-black/10">
                {m.items.map(item => (
                  <div
                    key={item.id}
                    className="p-3.5 flex items-center justify-between gap-3 hover:bg-[#F4F1EA]/50 transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 border-2 border-black rounded-xl bg-amber-100 flex items-center justify-center shrink-0 shadow-[1px_1px_0px_0px_#000]">
                        <CategoryIcon
                          name={item.category?.icon}
                          color="#000000"
                          size={20}
                          className="w-5 h-5 text-black"
                        />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-black truncate">
                          {item.note || item.category?.name || 'Compra en cuotas'}
                        </p>
                        <div className="flex flex-wrap items-center gap-1.5 mt-1 text-[11px]">
                          <span className="px-1.5 py-0.2 text-[10px] font-mono font-bold bg-[#F4F1EA] text-black border border-black rounded">
                            [{item.category?.name || 'General'}]
                          </span>
                          <span className="inline-flex items-center gap-1 text-[10px] font-mono font-bold text-black bg-[#C084FC] px-1.5 py-0.2 rounded border border-black shadow-[1px_1px_0px_0px_#000]">
                            <CreditCard className="w-2.5 h-2.5 stroke-[2.5px]" />
                            Cuota {item.installment_current} de {item.installment_total}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <p className="font-mono font-bold text-lg tabular-nums text-black">
                        {formatCurrency(item.amount, item.currency)}
                      </p>
                      {item.currency === 'USD' && (
                        <span className="inline-block px-1 py-0.2 bg-[#86EFAC] text-black font-mono font-bold text-[9px] border border-black rounded">
                          USD
                        </span>
                      )}
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
