'use client';

import React, { useState, useEffect } from 'react';
import { Transaction, Budget } from '@/lib/supabase/types';
import { fetchMonthlyBudget, saveMonthlyBudget } from '@/lib/supabase/client';
import { formatCurrency, formatMonthYear } from '@/lib/utils';
import { Target, AlertTriangle, AlertCircle, CheckCircle2, Pencil, Plus } from 'lucide-react';
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

  // Determine progress status colors in Bauhaus:
  // verde if <75%, amarilla if 75-99%, roja if >=100%
  let barBg = 'bg-[#86EFAC]';
  let badgeBg = 'bg-[#86EFAC] text-black border-2 border-black shadow-[1.5px_1.5px_0px_0px_#000]';
  let statusIcon = <CheckCircle2 className="w-3.5 h-3.5 stroke-[2.5px]" />;
  let statusText = `${percentage}% consumido`;

  if (percentage >= 100) {
    barBg = 'bg-[#FB923C]';
    badgeBg = 'bg-[#FB923C] text-black border-2 border-black shadow-[1.5px_1.5px_0px_0px_#000]';
    statusIcon = <AlertCircle className="w-3.5 h-3.5 stroke-[2.5px]" />;
    statusText = `¡Excedido por ${formatCurrency(Math.abs(remaining), 'ARS')}!`;
  } else if (percentage >= 75) {
    barBg = 'bg-[#FACC15]';
    badgeBg = 'bg-[#FACC15] text-black border-2 border-black shadow-[1.5px_1.5px_0px_0px_#000]';
    statusIcon = <AlertTriangle className="w-3.5 h-3.5 stroke-[2.5px]" />;
    statusText = `${percentage}% (alerta)`;
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
      <div className="bg-white border-2 border-black rounded-2xl shadow-[3px_3px_0px_0px_#000] p-5 text-black">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#FACC15] border-2 border-black shadow-[2px_2px_0px_0px_#000] flex items-center justify-center">
              <Target className="w-5 h-5 text-black stroke-[2.5px]" />
            </div>
            <div>
              <span className="inline-block px-2 py-0.5 bg-black text-white font-mono text-[10px] font-black tracking-wider uppercase rounded-md border border-black mb-0.5">
                [PRESUPUESTO MENSUAL]
              </span>
              <h3 className="text-base font-black tracking-tight text-black flex items-center gap-1.5">
                <span>Límite de Consumo</span>
                <span className="text-xs font-mono font-semibold text-zinc-500">
                  ({formatMonthYear(new Date())})
                </span>
              </h3>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {budget && budgetAmount > 0 && (
              <span
                className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-mono font-black ${badgeBg}`}
              >
                {statusIcon}
                <span>{statusText}</span>
              </span>
            )}

            <button
              onClick={handleOpenModal}
              className="flex items-center gap-1.5 px-3.5 py-1.5 bg-[#F4F1EA] hover:bg-[#FACC15] text-black border-2 border-black rounded-xl text-xs font-black shadow-[2px_2px_0px_0px_#000] transition-all active:translate-x-[1px] active:translate-y-[1px] active:shadow-[1px_1px_0px_0px_#000]"
            >
              {budget && budgetAmount > 0 ? (
                <>
                  <Pencil className="w-3.5 h-3.5 stroke-[2.5px]" />
                  <span>Editar</span>
                </>
              ) : (
                <>
                  <Plus className="w-3.5 h-3.5 stroke-[3px]" />
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
                <span className="text-xs font-bold text-zinc-600 uppercase font-mono">Gastado hasta hoy: </span>
                <div className="text-xl sm:text-2xl font-black font-mono tabular-nums text-black">
                  {formatCurrency(monthlyExpensesArs, 'ARS')}
                </div>
              </div>
              <div className="text-right">
                <span className="text-xs font-bold text-zinc-600 uppercase font-mono">Tope mensual: </span>
                <div className="text-lg sm:text-xl font-black font-mono tabular-nums text-black">
                  {formatCurrency(budgetAmount, 'ARS')}
                </div>
              </div>
            </div>

            {/* Visual Progress Bar */}
            <div className="mt-3">
              <div className="w-full h-4 bg-[#F4F1EA] border-2 border-black rounded-full overflow-hidden p-0.5 shadow-[1px_1px_0px_0px_#000]">
                <div
                  className={`h-full rounded-full transition-all duration-500 border-r-2 border-black ${barBg}`}
                  style={{ width: `${Math.min(100, Math.max(0, percentage))}%` }}
                />
              </div>
            </div>

            {/* Footer details */}
            <div className="flex flex-wrap items-center justify-between text-xs font-mono font-bold text-zinc-700 mt-3 pt-2.5 border-t-2 border-black/10">
              <span>
                {isOver ? (
                  <span className="text-rose-700 font-black">
                    🚨 LÍMITE SUPERADO POR {formatCurrency(Math.abs(remaining), 'ARS')}
                  </span>
                ) : (
                  <span>
                    DISPONIBLE:{' '}
                    <strong className="text-black font-black">
                      {formatCurrency(remaining, 'ARS')}
                    </strong>
                  </span>
                )}
              </span>
              <span className="text-zinc-600">
                {percentage}% DEL TOTAL
              </span>
            </div>
          </div>
        ) : (
          <div className="mt-2 py-4 px-4 rounded-xl bg-[#F4F1EA] border-2 border-dashed border-black/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="text-xs text-zinc-800">
              <p className="font-black text-black">Sin presupuesto asignado para este mes</p>
              <p className="text-[11px] font-medium text-zinc-600 mt-0.5">
                Definí un límite de gastos mensual para monitorear tu progreso y recibir alertas automáticas.
              </p>
            </div>
            <button
              onClick={handleOpenModal}
              className="shrink-0 flex items-center gap-1.5 bg-[#86EFAC] hover:bg-[#4ade80] text-black border-2 border-black shadow-[2px_2px_0px_0px_#000] text-xs font-black py-2 px-3.5 rounded-xl transition-all active:translate-x-[1px] active:translate-y-[1px]"
            >
              <Plus className="w-3.5 h-3.5 stroke-[3px]" />
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
        <form onSubmit={handleSaveBudget} className="space-y-4 text-black">
          <div>
            <label className="block text-xs font-black text-black uppercase font-mono mb-1.5">
              Monto tope mensual (ARS)
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-black font-black text-sm">
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
                className="w-full bg-white border-2 border-black rounded-xl pl-8 pr-4 py-2.5 text-sm font-mono font-bold text-black placeholder:text-zinc-400 shadow-[2px_2px_0px_0px_#000] focus:outline-none"
              />
            </div>
          </div>

          {/* Quick Presets */}
          <div>
            <span className="block text-[11px] font-mono font-bold text-zinc-600 mb-1.5">[VALORES RÁPIDOS]:</span>
            <div className="flex flex-wrap gap-2">
              {presets.map(p => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setInputAmount(String(p))}
                  className="px-3 py-1 rounded-lg bg-white hover:bg-[#FACC15] border-2 border-black shadow-[1.5px_1.5px_0px_0px_#000] text-xs font-mono font-bold text-black transition-all active:translate-x-[1px] active:translate-y-[1px]"
                >
                  ${(p / 1000).toLocaleString('es-AR')}k
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-4 border-t-2 border-black/10">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="px-4 py-2 rounded-xl text-xs font-bold text-black hover:bg-black/5 border-2 border-transparent transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving || !inputAmount || Number(inputAmount) <= 0}
              className="px-5 py-2.5 rounded-xl text-xs font-black bg-[#FACC15] hover:bg-[#eab308] text-black border-2 border-black shadow-[3px_3px_0px_0px_#000] transition-all disabled:opacity-50 active:translate-x-[2px] active:translate-y-[2px] active:shadow-[1px_1px_0px_0px_#000]"
            >
              {saving ? 'Guardando...' : 'Guardar Presupuesto'}
            </button>
          </div>
        </form>
      </Modal>
    </>
  );
}
