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
  '#FACC15', // yellow
  '#60A5FA', // blue
  '#FB923C', // coral
  '#86EFAC', // mint
  '#C084FC', // purple
  '#38BDF8', // sky
  '#F472B6', // pink
  '#4ADE80', // green
  '#FBBF24', // amber
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
        <div className="rounded-xl bg-white border-2 border-black p-3 shadow-[3px_3px_0px_0px_#000] text-xs font-mono text-black">
          <p className="font-black text-black mb-1 flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full border border-black" style={{ backgroundColor: entry.color }} />
            {entry.name}
          </p>
          <p className="text-black font-bold tabular-nums">{formatCurrency(entry.amount, currency)}</p>
          <p className="text-zinc-600 text-[11px] font-semibold mt-0.5">{entry.percentage.toFixed(1)}% del total</p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="bg-white border-2 border-black rounded-2xl shadow-[3px_3px_0px_0px_#000] p-5 text-black flex flex-col justify-between">
      {/* Header with Switchers */}
      <div className="flex flex-wrap items-center justify-between gap-2 pb-4 border-b-2 border-black/10">
        <div>
          <span className="inline-block px-2 py-0.5 bg-black text-white font-mono text-[10px] font-black tracking-wider uppercase rounded-md border border-black mb-1">
            [CATEGORÍAS]
          </span>
          <h3 className="text-base font-black tracking-tight text-black">Gastos por Categoría</h3>
          <p className="text-xs font-mono font-medium text-zinc-600">Distribución de egresos del mes</p>
        </div>

        <div className="flex items-center gap-2">
          {/* Currency Toggle */}
          <div className="flex bg-[#F4F1EA] p-0.5 rounded-xl border-2 border-black shadow-[1px_1px_0px_0px_#000]">
            <button
              onClick={() => setCurrency('ARS')}
              className={`px-2.5 py-1 text-[11px] font-mono font-bold rounded-lg transition-all ${
                currency === 'ARS'
                  ? 'bg-[#60A5FA] text-black border border-black shadow-[1px_1px_0px_0px_#000]'
                  : 'text-zinc-600 hover:text-black'
              }`}
            >
              ARS
            </button>
            <button
              onClick={() => setCurrency('USD')}
              className={`px-2.5 py-1 text-[11px] font-mono font-bold rounded-lg transition-all ${
                currency === 'USD'
                  ? 'bg-[#86EFAC] text-black border border-black shadow-[1px_1px_0px_0px_#000]'
                  : 'text-zinc-600 hover:text-black'
              }`}
            >
              USD
            </button>
          </div>

          {/* Chart Type Toggle */}
          <div className="flex bg-[#F4F1EA] p-0.5 rounded-xl border-2 border-black shadow-[1px_1px_0px_0px_#000]">
            <button
              onClick={() => setChartType('pie')}
              className={`p-1.5 rounded-lg transition-all ${
                chartType === 'pie'
                  ? 'bg-[#FACC15] text-black border border-black shadow-[1px_1px_0px_0px_#000]'
                  : 'text-zinc-600 hover:text-black'
              }`}
              title="Gráfico de Dona"
            >
              <PieIcon className="w-3.5 h-3.5 stroke-[2.5px]" />
            </button>
            <button
              onClick={() => setChartType('bar')}
              className={`p-1.5 rounded-lg transition-all ${
                chartType === 'bar'
                  ? 'bg-[#FACC15] text-black border border-black shadow-[1px_1px_0px_0px_#000]'
                  : 'text-zinc-600 hover:text-black'
              }`}
              title="Gráfico de Barras"
            >
              <BarChart2 className="w-3.5 h-3.5 stroke-[2.5px]" />
            </button>
          </div>
        </div>
      </div>

      {/* Chart Container */}
      <div className="py-4">
        {data.length === 0 ? (
          <div className="h-60 flex flex-col items-center justify-center text-zinc-500 text-xs font-mono font-bold bg-[#F4F1EA] border-2 border-dashed border-black/30 rounded-xl">
            <DollarSign className="w-8 h-8 stroke-[2px] mb-2 opacity-50" />
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
                        stroke="#000000"
                        strokeWidth={2}
                      />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                </PieChart>
              ) : (
                <BarChart data={data} layout="vertical" margin={{ top: 5, right: 20, left: 30, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e5e5" horizontal={false} />
                  <XAxis type="number" stroke="#000000" fontSize={11} tickFormatter={v => `$${v}`} className="font-mono font-bold" />
                  <YAxis type="category" dataKey="name" stroke="#000000" fontSize={11} width={80} className="font-mono font-bold" />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="amount" radius={[0, 6, 6, 0]} stroke="#000000" strokeWidth={1.5}>
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
        <div className="pt-3 border-t-2 border-black/10 space-y-2 max-h-40 overflow-y-auto pr-1">
          {data.slice(0, 5).map(item => (
            <div key={item.name} className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-2 min-w-0">
                <span className="w-2.5 h-2.5 rounded-full shrink-0 border border-black" style={{ backgroundColor: item.color }} />
                <span className="text-black font-bold truncate max-w-[140px] sm:max-w-none">
                  {item.name}
                </span>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <span className="text-zinc-600 font-mono font-semibold text-[11px]">{item.percentage.toFixed(0)}%</span>
                <span className="font-mono font-bold text-black tabular-nums">{formatCurrency(item.amount, currency)}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
