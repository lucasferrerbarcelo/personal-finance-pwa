'use client';

import React, { useMemo } from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
} from 'recharts';
import { Transaction } from '@/lib/supabase/types';
import { formatCurrency, formatMonthYear } from '@/lib/utils';
import { CalendarRange } from 'lucide-react';

interface InstallmentBarChartProps {
  transactions: Transaction[];
  baseDate?: Date;
}

export function InstallmentBarChart({ transactions, baseDate = new Date() }: InstallmentBarChartProps) {
  // Generate data for the next 6 months
  const chartData = useMemo(() => {
    const months = [];
    for (let i = 0; i < 6; i++) {
      const d = new Date(baseDate.getFullYear(), baseDate.getMonth() + i, 1);
      const year = d.getFullYear();
      const monthNum = String(d.getMonth() + 1).padStart(2, '0');
      const prefix = `${year}-${monthNum}`;
      const label = d.toLocaleDateString('es-ES', { month: 'short' });
      const fullLabel = formatMonthYear(d);

      const monthInstallments = transactions.filter(
        t =>
          t.date.startsWith(prefix) &&
          t.type === 'expense' &&
          t.installment_total &&
          t.installment_total > 1
      );

      const arsAmount = monthInstallments
        .filter(t => t.currency === 'ARS')
        .reduce((sum, t) => sum + Number(t.amount), 0);

      const usdAmount = monthInstallments
        .filter(t => t.currency === 'USD')
        .reduce((sum, t) => sum + Number(t.amount), 0);

      months.push({
        prefix,
        label: `${label.charAt(0).toUpperCase() + label.slice(1)} ${year.toString().slice(2)}`,
        fullLabel,
        ARS: arsAmount,
        USD: usdAmount,
        count: monthInstallments.length,
      });
    }
    return months;
  }, [transactions, baseDate]);

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="rounded-xl bg-white border-2 border-black p-3 shadow-[3px_3px_0px_0px_#000] text-xs font-mono text-black space-y-1">
          <p className="font-black text-black mb-1.5 uppercase tracking-wider">{data.fullLabel}</p>
          <p className="text-black font-black tabular-nums">
            ARS: {formatCurrency(data.ARS, 'ARS')}
          </p>
          {data.USD > 0 && (
            <p className="text-emerald-800 font-bold tabular-nums">
              USD: {formatCurrency(data.USD, 'USD')}
            </p>
          )}
          <p className="text-[11px] text-zinc-600 pt-1 border-t-2 border-black/10 font-bold">
            {data.count} {data.count === 1 ? 'cuota comprometida' : 'cuotas comprometidas'}
          </p>
        </div>
      );
    }
    return null;
  };

  const hasAnyInstallments = chartData.some(d => d.ARS > 0 || d.USD > 0);

  return (
    <div className="bg-white border-2 border-black rounded-2xl shadow-[3px_3px_0px_0px_#000] p-5 text-black">
      <div className="flex items-center justify-between pb-4 border-b-2 border-black/10">
        <div>
          <span className="inline-block px-2 py-0.5 bg-black text-white font-mono text-[10px] font-black tracking-wider uppercase rounded-md border border-black mb-1">
            [PROYECCIÓN TEMPORAL]
          </span>
          <h3 className="text-base font-black text-black tracking-tight flex items-center gap-2">
            <CalendarRange className="w-4 h-4 stroke-[2.5px] text-black" />
            Compromiso en Cuotas (Próximos 6 Meses)
          </h3>
          <p className="text-xs font-mono font-medium text-zinc-600">Evolución de cuotas pendientes a pagar</p>
        </div>
      </div>

      <div className="py-4">
        {!hasAnyInstallments ? (
          <div className="h-60 flex flex-col items-center justify-center text-zinc-500 text-xs font-mono font-bold bg-[#F4F1EA] border-2 border-dashed border-black/30 rounded-xl">
            <CalendarRange className="w-8 h-8 stroke-[2px] opacity-40 mb-2" />
            <span>No hay cuotas registradas para los próximos 6 meses</span>
          </div>
        ) : (
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 10, right: 10, left: 10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e5e5" vertical={false} />
                <XAxis dataKey="label" stroke="#000000" fontSize={11} className="font-mono font-bold" />
                <YAxis
                  stroke="#000000"
                  fontSize={11}
                  className="font-mono font-bold"
                  tickFormatter={v => (v >= 1000 ? `$${v / 1000}k` : `$${v}`)}
                />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="ARS" fill="#C084FC" stroke="#000000" strokeWidth={1.5} radius={[6, 6, 0, 0]} name="Cuotas ARS" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </div>
  );
}
