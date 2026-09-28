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
        <div className="rounded-xl bg-[#18181b] border border-white/10 p-3 shadow-2xl text-xs space-y-1">
          <p className="font-bold text-white mb-1.5">{data.fullLabel}</p>
          <p className="text-purple-400 font-semibold">
            ARS: {formatCurrency(data.ARS, 'ARS')}
          </p>
          {data.USD > 0 && (
            <p className="text-emerald-400 font-semibold">
              USD: {formatCurrency(data.USD, 'USD')}
            </p>
          )}
          <p className="text-[11px] text-zinc-400 pt-1 border-t border-white/10">
            {data.count} {data.count === 1 ? 'cuota comprometida' : 'cuotas comprometidas'}
          </p>
        </div>
      );
    }
    return null;
  };

  const hasAnyInstallments = chartData.some(d => d.ARS > 0 || d.USD > 0);

  return (
    <div className="rounded-2xl bg-[#121216] border border-white/10 p-5 shadow-lg">
      <div className="flex items-center justify-between pb-4 border-b border-white/5">
        <div>
          <h3 className="text-sm font-bold text-white tracking-tight flex items-center gap-2">
            <CalendarRange className="w-4 h-4 text-purple-400" />
            Compromiso en Cuotas (Próximos 6 Meses)
          </h3>
          <p className="text-xs text-zinc-400">Evolución de cuotas pendientes a pagar</p>
        </div>
      </div>

      <div className="py-4">
        {!hasAnyInstallments ? (
          <div className="h-60 flex flex-col items-center justify-center text-zinc-500 text-xs">
            <CalendarRange className="w-8 h-8 opacity-40 mb-2" />
            <span>No hay cuotas registradas para los próximos 6 meses</span>
          </div>
        ) : (
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 10, right: 10, left: 10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
                <XAxis dataKey="label" stroke="#71717a" fontSize={11} />
                <YAxis
                  stroke="#71717a"
                  fontSize={11}
                  tickFormatter={v => (v >= 1000 ? `$${v / 1000}k` : `$${v}`)}
                />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="ARS" fill="#a855f7" radius={[6, 6, 0, 0]} name="Cuotas ARS" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </div>
  );
}
