'use client';

import React, { useState, useEffect } from 'react';
import { Transaction, Budget } from '@/lib/supabase/types';
import { fetchMonthlyBudget, saveMonthlyBudget } from '@/lib/supabase/client';
import { formatCurrency, formatMonthYear } from '@/lib/utils';
import { Target, TrendingUp, AlertTriangle, AlertCircle, CheckCircle2, Pencil, Plus } from 'lucide-react';
import { Modal } from '@/components/UI/Modal';

interface MonthlyBudgetCardProps {
  transactions: Transaction[];
  currentMonthStr: string; // YYYY-MM
  onRefresh?: () => void;
}

export function MonthlyBudgetCard({
  transactions,
  currentMonthStr,
  onRefresh,
}: MonthlyBudgetCardProps) {
  const [budget, setBudget] = useState<Budget | null>(null);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [inputAmount, setInputAmount] = useState('');
  const [saving, setSaving] = useState(false);

  // Load budget on mount or month change
  const loadBudget = async () => {
    try {
      setLoading(true);
      const b = await fetchMonthlyBudget(currentMonthStr, 'ARS');
      setBudget(b);
      if (b) {
        setInputAmount(String(b.amount));
      }
    } catch (err) {
      console.error('Error fetching monthly budget:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBudget();
  }, [currentMonthStr]);

  // Calculate spent in ARS for this month
  const monthlyExpensesArs = transactions
    .filter(
      t =>
        t.date.startsWith(currentMonthStr) &&
        t.type === 'expense' &&
        (t.currency || 'ARS') === 'ARS'
    )
    .reduce((sum, t) => sum + Number(t.amount), 0);

  const budgetAmount = budget ? Number(budget.amount) : 0;
  const percentage = budgetAmount > 0 ? Math.round((monthlyExpensesArs / budgetAmount) * 100) : 0;
  const remaining = budgetAmount - monthlyExpensesArs;
  const isOver = remaining < 0;

  // Determine progress status colors:
  // verde if <75%, amarilla if 75-99%, roja if >=100%
  let statusColor = 'emerald';
  let barBg = 'bg-emerald-500';
  let barGlow = 'shadow-emerald-500/20';
  let badgeBg = 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
  let statusIcon = <CheckCircle2 className="w-3.5 h-3.5" />;
  let statusText = `${percentage}% consumido`;

  if (percentage >= 100) {
    statusColor = 'rose';
    barBg = 'bg-rose-500';
    barGlow = 'shadow-rose-500/20';
    badgeBg = 'bg-rose-500/10 text-rose-400 border-rose-500/20';
    statusIcon = <AlertCircle className="w-3.5 h-3.5" />;
    statusText = `¡Excedido por ${formatCurrency(Math.abs(remaining), 'ARS')}!`;
  } else if (percentage >= 75) {
    statusColor = 'amber';
    barBg = 'bg-amber-500';
    barGlow = 'shadow-amber-500/20';
    badgeBg = 'bg-amber-500/10 text-amber-400 border-amber-500/20';
    statusIcon = <AlertTriangle className="w-3.5 h-3.5" />;
    statusText = `${percentage}% (alerta de consumo)`;
  }

  const handleOpenModal = () => {
    setInputAmount(budget ? String(budget.amount) : '');
    setIsModalOpen(true);
  };

  const handleSaveBudget = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanNum = parseFloat(inputAmount.replace(/\./g, '').replace(',', '.'));
    if (isNaN(cleanNum) || cleanNum <= 0) return;

    setSaving(true);
    try {
      const updated = await saveMonthlyBudget(currentMonthStr, cleanNum, 'ARS');
      setBudget(updated);
      setIsModalOpen(false);
      onRefresh?.();
    } catch (err) {
      console.error('Error saving budget:', err);
    } finally {
      setSaving(false);
    }
  };

  const presets = [300000, 500000, 750000, 1000000, 1500000];

  return (
    <>
      <div className="relative overflow-hidden rounded-2xl bg-[#121216] border border-white/10 p-5 shadow-lg transition-all">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              <Target className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-white tracking-tight flex items-center gap-2">
                <span>Presupuesto Mensual</span>
                <span className="text-[11px] font-normal text-zinc-400">
                  ({formatMonthYear(new Date())})
                </span>
              </h3>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {budget && budgetAmount > 0 && (
              <span
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium border ${badgeBg}`}
              >
                {statusIcon}
                <span>{statusText}</span>
              </span>
            )}

            <button
              onClick={handleOpenModal}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium text-zinc-300 hover:text-white bg-white/5 hover:bg-white/10 border border-white/10 transition-all active:scale-95"
            >
              {budget && budgetAmount > 0 ? (
                <>
                  <Pencil className="w-3.5 h-3.5" />
                  <span>Editar</span>
                </>
              ) : (
                <>
                  <Plus className="w-3.5 h-3.5" />
                  <span>Fijar Presupuesto</span>
                </>
              )}
            </button>
          </div>
        </div>

        {budget && budgetAmount > 0 ? (
          <div>
            {/* Amount details */}
            <div className="flex flex-wrap items-baseline justify-between gap-2 mt-4">
              <div>
                <span className="text-xs text-zinc-400">Gastado hasta hoy: </span>
                <span className="text-lg md:text-xl font-black text-white">
                  {formatCurrency(monthlyExpensesArs, 'ARS')}
                </span>
              </div>
              <div className="text-right">
                <span className="text-xs text-zinc-400">Tope mensual: </span>
                <span className="text-sm md:text-base font-bold text-zinc-200">
                  {formatCurrency(budgetAmount, 'ARS')}
                </span>
              </div>
            </div>

            {/* Visual Progress Bar */}
            <div className="mt-3">
              <div className="relative w-full h-3.5 bg-zinc-800/80 rounded-full overflow-hidden p-0.5 border border-white/5">
                <div
                  className={`h-full rounded-full transition-all duration-500 shadow-md ${barBg} ${barGlow}`}
                  style={{ width: `${Math.min(100, Math.max(0, percentage))}%` }}
                />
              </div>
            </div>

            {/* Footer details: Remaining or Exceeded */}
            <div className="flex items-center justify-between text-xs text-zinc-400 mt-2.5 pt-2 border-t border-white/5">
              <span>
                {isOver ? (
                  <span className="text-rose-400 font-medium">
                    🚨 Límite superado por {formatCurrency(Math.abs(remaining), 'ARS')}
                  </span>
                ) : (
                  <span>
                    Disponible restante:{' '}
                    <strong className="text-emerald-400 font-semibold">
                      {formatCurrency(remaining, 'ARS')}
                    </strong>
                  </span>
                )}
              </span>
              <span className="text-[11px] text-zinc-500">
                {percentage}% del total fijado
              </span>
            </div>
          </div>
        ) : (
          <div className="mt-2 py-3 px-4 rounded-xl bg-white/[0.02] border border-dashed border-white/10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="text-xs text-zinc-400">
              <p className="text-zinc-300 font-medium">Sin presupuesto asignado para este mes</p>
              <p className="text-[11px] text-zinc-500 mt-0.5">
                Definí un límite de gastos mensual para monitorear tu progreso y recibir alertas automáticas.
              </p>
            </div>
            <button
              onClick={handleOpenModal}
              className="shrink-0 flex items-center gap-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 text-xs font-semibold py-2 px-3 rounded-xl transition-all active:scale-95"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Establecer Presupuesto</span>
            </button>
          </div>
        )}
      </div>

      {/* Modal to Set/Edit Budget */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={budget && budgetAmount > 0 ? 'Editar Presupuesto Mensual' : 'Fijar Presupuesto Mensual'}
        subtitle={`Para el mes de ${formatMonthYear(new Date())}`}
      >
        <form onSubmit={handleSaveBudget} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-zinc-300 mb-1.5">
              Monto tope mensual (ARS)
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400 font-semibold text-sm">
                $
              </span>
              <input
                type="number"
                min="1"
                step="any"
                value={inputAmount}
                onChange={e => setInputAmount(e.target.value)}
                placeholder="Ej: 600000"
                required
                className="w-full bg-[#18181f] border border-white/10 rounded-xl pl-8 pr-4 py-2.5 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-emerald-500/50 transition-colors"
              />
            </div>
          </div>

          {/* Quick Presets */}
          <div>
            <span className="block text-[11px] text-zinc-500 mb-1.5">Valores rápidos:</span>
            <div className="flex flex-wrap gap-1.5">
              {presets.map(p => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setInputAmount(String(p))}
                  className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 border border-white/5 text-[11px] text-zinc-300 transition-colors"
                >
                  ${(p / 1000).toLocaleString('es-AR')}k
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-white/10">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="px-4 py-2 rounded-xl text-xs font-medium text-zinc-400 hover:text-white hover:bg-white/5 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving || !inputAmount || Number(inputAmount) <= 0}
              className="px-4 py-2 rounded-xl text-xs font-semibold bg-emerald-500 hover:bg-emerald-400 text-black shadow-lg shadow-emerald-500/20 transition-all disabled:opacity-50 active:scale-95"
            >
              {saving ? 'Guardando...' : 'Guardar Presupuesto'}
            </button>
          </div>
        </form>
      </Modal>
    </>
  );
}
