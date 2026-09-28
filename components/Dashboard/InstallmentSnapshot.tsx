'use client';

import React from 'react';
import Link from 'next/link';
import { Transaction } from '@/lib/supabase/types';
import { formatCurrency, formatMonthYear } from '@/lib/utils';
import { CalendarClock, ArrowRight, CreditCard } from 'lucide-react';

interface InstallmentSnapshotProps {
  transactions: Transaction[];
  baseDate?: Date;
}

export function InstallmentSnapshot({ transactions, baseDate = new Date() }: InstallmentSnapshotProps) {
  // Generate next 3 months descriptors
  const next3Months = [0, 1, 2].map(offset => {
    const d = new Date(baseDate.getFullYear(), baseDate.getMonth() + offset, 1);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const prefix = `${year}-${month}`;
    return {
      date: d,
      prefix,
      label: formatMonthYear(d),
      isCurrent: offset === 0,
    };
  });

  const monthCommitments = next3Months.map(m => {
    const installmentTxs = transactions.filter(
      t =>
        t.date.startsWith(m.prefix) &&
        t.type === 'expense' &&
        t.installment_total &&
        t.installment_total > 1
    );

    const totalArs = installmentTxs
      .filter(t => t.currency === 'ARS')
      .reduce((sum, t) => sum + Number(t.amount), 0);

    const totalUsd = installmentTxs
      .filter(t => t.currency === 'USD')
      .reduce((sum, t) => sum + Number(t.amount), 0);

    return {
      ...m,
      items: installmentTxs,
      count: installmentTxs.length,
      totalArs,
      totalUsd,
    };
  });

  return (
    <div className="rounded-2xl bg-[#121216] border border-white/10 p-5 shadow-lg">
      <div className="flex items-center justify-between pb-4 border-b border-white/5">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-xl bg-purple-500/10 text-purple-400">
            <CreditCard className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white tracking-tight">Compromisos de Cuotas</h3>
            <p className="text-xs text-zinc-400">Tarjetas de crédito próximos 3 meses</p>
          </div>
        </div>

        <Link
          href="/cuotas"
          className="flex items-center gap-1 text-xs text-emerald-400 hover:text-emerald-300 font-medium transition-colors"
        >
          <span>Ver 6 meses</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 mt-4">
        {monthCommitments.map((month, idx) => (
          <div
            key={month.prefix}
            className={`rounded-xl p-3.5 border transition-all ${
              month.isCurrent
                ? 'bg-purple-950/20 border-purple-500/30 shadow-inner'
                : 'bg-white/5 border-white/5 hover:border-white/10'
            }`}
          >
            <div className="flex items-center justify-between text-xs mb-2">
              <span className={`font-semibold ${month.isCurrent ? 'text-purple-300' : 'text-zinc-300'}`}>
                {month.label}
              </span>
              {month.isCurrent && (
                <span className="text-[10px] bg-purple-500/20 text-purple-300 px-1.5 py-0.5 rounded font-medium">
                  Actual
                </span>
              )}
            </div>

            <div className="space-y-1">
              <p className="text-lg font-extrabold text-white">
                {formatCurrency(month.totalArs, 'ARS')}
              </p>
              {month.totalUsd > 0 && (
                <p className="text-xs font-semibold text-emerald-400">
                  + {formatCurrency(month.totalUsd, 'USD')}
                </p>
              )}
            </div>

            <div className="mt-3 pt-2.5 border-t border-white/5 flex items-center justify-between text-[11px] text-zinc-400">
              <span className="flex items-center gap-1">
                <CalendarClock className="w-3 h-3 text-zinc-400" />
                {month.count} {month.count === 1 ? 'cuota activa' : 'cuotas activas'}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
