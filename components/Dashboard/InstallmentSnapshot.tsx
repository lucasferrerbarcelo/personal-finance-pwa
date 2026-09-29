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
    <div className="bg-white border-2 border-black rounded-2xl shadow-[3px_3px_0px_0px_#000] p-5 text-black">
      <div className="flex items-center justify-between pb-4 border-b-2 border-black/10">
        <div>
          <span className="inline-block px-2 py-0.5 bg-black text-white font-mono text-[10px] font-black tracking-wider uppercase rounded-md border border-black mb-1">
            [CUOTAS FUTURAS]
          </span>
          <h3 className="text-base font-black tracking-tight text-black">Compromisos de Cuotas</h3>
          <p className="text-xs font-mono font-medium text-zinc-600">Tarjetas de crédito próximos 3 meses</p>
        </div>

        <Link
          href="/cuotas"
          className="flex items-center gap-1.5 px-3 py-1.5 bg-[#C084FC] hover:bg-[#a855f7] text-black border-2 border-black rounded-xl text-xs font-black shadow-[2px_2px_0px_0px_#000] transition-all active:translate-x-[1px] active:translate-y-[1px]"
        >
          <span>Ver 6 meses</span>
          <ArrowRight className="w-3.5 h-3.5 stroke-[2.5px]" />
        </Link>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 mt-4">
        {monthCommitments.map(month => (
          <div
            key={month.prefix}
            className={`rounded-xl p-3.5 border-2 border-black transition-all shadow-[2px_2px_0px_0px_#000] ${
              month.isCurrent
                ? 'bg-[#FEF08A]'
                : 'bg-white'
            }`}
          >
            <div className="flex items-center justify-between text-xs mb-2">
              <span className="font-mono font-black text-black uppercase tracking-wider">
                {month.label}
              </span>
              {month.isCurrent && (
                <span className="text-[10px] font-mono font-black bg-black text-white px-2 py-0.5 rounded border border-black">
                  ACTUAL
                </span>
              )}
            </div>

            <div className="space-y-1">
              <p className="text-lg font-mono font-black tabular-nums text-black">
                {formatCurrency(month.totalArs, 'ARS')}
              </p>
              {month.totalUsd > 0 && (
                <p className="text-xs font-mono font-bold text-emerald-800">
                  + {formatCurrency(month.totalUsd, 'USD')}
                </p>
              )}
            </div>

            <div className="mt-3 pt-2.5 border-t-2 border-black/10 flex items-center justify-between text-[11px] font-mono font-bold text-zinc-700">
              <span className="flex items-center gap-1">
                <CalendarClock className="w-3.5 h-3.5 stroke-[2.5px] text-black" />
                {month.count} {month.count === 1 ? 'cuota activa' : 'cuotas activas'}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
