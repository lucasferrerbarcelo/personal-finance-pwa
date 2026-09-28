'use client';

import React, { useState, useMemo } from 'react';
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
} from 'recharts';
import { Transaction, Currency } from '@/lib/supabase/types';
import { formatCurrency } from '@/lib/utils';
import { PieChart as PieIcon, BarChart2, DollarSign } from 'lucide-react';

interface CategoryDonutChartProps {
  transactions: Transaction[];
  currentMonthStr: string; // YYYY-MM
}

const DEFAULT_COLORS = [
  '#10b981', // emerald
  '#f59e0b', // amber
  '#6366f1', // indigo
  '#3b82f6', // blue
  '#ec4899', // pink
  '#8b5cf6', // purple
  '#ef4444', // red
  '#14b8a6', // teal
  '#f97316', // orange
  '#06b6d4', // cyan
];

export function CategoryDonutChart({ transactions, currentMonthStr }: CategoryDonutChartProps) {
  const [currency, setCurrency] = useState<Currency>('ARS');
  const [chartType, setChartType] = useState<'pie' | 'bar'>('pie');

  // Filter this month's expenses for selected currency
  const data = useMemo(() => {
    const expenses = transactions.filter(
      t => t.date.startsWith(currentMonthStr) && t.type === 'expense' && t.currency === currency
    );

    const categoryTotals = new Map<string, { name: string; amount: number; color?: string }>();

    for (const tx of expenses) {
      const catName = tx.category?.name || 'Sin categoría';
      const catColor = tx.category?.color;
      const current = categoryTotals.get(catName) || { name: catName, amount: 0, color: catColor || undefined };
      current.amount += Number(tx.amount);
      categoryTotals.set(catName, current);
    }

    const items = Array.from(categoryTotals.values()).sort((a, b) => b.amount - a.amount);
    const totalSum = items.reduce((acc, i) => acc + i.amount, 0);

    return items.map((item, index) => ({
      ...item,
      percentage: totalSum > 0 ? (item.amount / totalSum) * 100 : 0,
      color: item.color || DEFAULT_COLORS[index % DEFAULT_COLORS.length],
    }));
  }, [transactions, currentMonthStr, currency]);

  const totalExpense = data.reduce((acc, i) => acc + i.amount, 0);

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const entry = payload[0].payload;
      return (
        <div className="rounded-xl bg-[#18181b] border border-white/10 p-3 shadow-2xl text-xs">
          <p className="font-bold text-white mb-1 flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: entry.color }} />
            {entry.name}
          </p>
          <p className="text-zinc-300 font-semibold">{formatCurrency(entry.amount, currency)}</p>
          <p className="text-zinc-400 text-[11px] mt-0.5">{entry.percentage.toFixed(1)}% del total</p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="rounded-2xl bg-[#121216] border border-white/10 p-5 shadow-lg flex flex-col justify-between">
      {/* Header with Switchers */}
      <div className="flex flex-wrap items-center justify-between gap-2 pb-4 border-b border-white/5">
        <div>
          <h3 className="text-sm font-bold text-white tracking-tight">Gastos por Categoría</h3>
          <p className="text-xs text-zinc-400">Distribución de egresos del mes</p>
        </div>

        <div className="flex items-center gap-2">
          {/* Currency Toggle */}
          <div className="flex bg-white/5 p-0.5 rounded-lg border border-white/10">
            <button
              onClick={() => setCurrency('ARS')}
              className={`px-2 py-1 text-[11px] font-bold rounded-md transition-all ${
                currency === 'ARS'
                  ? 'bg-sky-500/20 text-sky-400 border border-sky-500/30'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              ARS
            </button>
            <button
              onClick={() => setCurrency('USD')}
              className={`px-2 py-1 text-[11px] font-bold rounded-md transition-all ${
                currency === 'USD'
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              USD
            </button>
          </div>

          {/* Chart Type Toggle */}
          <div className="flex bg-white/5 p-0.5 rounded-lg border border-white/10">
            <button
              onClick={() => setChartType('pie')}
              className={`p-1.5 rounded-md transition-all ${
                chartType === 'pie'
                  ? 'bg-white/15 text-white'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
              title="Gráfico de Dona"
            >
              <PieIcon className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setChartType('bar')}
              className={`p-1.5 rounded-md transition-all ${
                chartType === 'bar'
                  ? 'bg-white/15 text-white'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
              title="Gráfico de Barras"
            >
              <BarChart2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Chart Container */}
      <div className="py-4">
        {data.length === 0 ? (
          <div className="h-60 flex flex-col items-center justify-center text-zinc-500 text-xs">
            <DollarSign className="w-8 h-8 stroke-[1.5px] mb-2 opacity-50" />
            <span>No hay gastos registrados en {currency} este mes</span>
          </div>
        ) : (
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              {chartType === 'pie' ? (
                <PieChart>
                  <Pie
                    data={data}
                    cx="50%"
                    cy="50%"
                    innerRadius={65}
                    outerRadius={95}
                    paddingAngle={3}
                    dataKey="amount"
                  >
                    {data.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={entry.color}
                        stroke="#121216"
                        strokeWidth={2}
                      />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                </PieChart>
              ) : (
                <BarChart data={data} layout="vertical" margin={{ top: 5, right: 20, left: 30, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#27272a" horizontal={false} />
                  <XAxis type="number" stroke="#71717a" fontSize={11} tickFormatter={v => `$${v}`} />
                  <YAxis type="category" dataKey="name" stroke="#71717a" fontSize={11} width={80} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="amount" radius={[0, 6, 6, 0]}>
                    {data.map((entry, index) => (
                      <Cell key={`bar-${index}`} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              )}
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* Legend / Category breakdown list */}
      {data.length > 0 && (
        <div className="pt-3 border-t border-white/5 space-y-2 max-h-40 overflow-y-auto pr-1">
          {data.slice(0, 5).map(item => (
            <div key={item.name} className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                <span className="text-zinc-300 font-medium truncate max-w-[140px] sm:max-w-none">
                  {item.name}
                </span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-zinc-400 text-[11px]">{item.percentage.toFixed(0)}%</span>
                <span className="font-semibold text-white">{formatCurrency(item.amount, currency)}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
