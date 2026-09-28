'use client';

import React, { useState, useEffect } from 'react';
import { Transaction } from '@/lib/supabase/types';
import { fetchTransactions } from '@/lib/supabase/client';
import { InstallmentBarChart } from '@/components/Cuotas/InstallmentBarChart';
import { MonthlyInstallments } from '@/components/Cuotas/MonthlyInstallments';
import { useApp } from '@/components/Layout/AppShell';
import { formatCurrency } from '@/lib/utils';
import { CalendarClock, CreditCard, RefreshCw, PlusCircle, AlertCircle } from 'lucide-react';

export default function CuotasPage() {
  const { openNewTxModal, refreshTrigger } = useApp();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await fetchTransactions();
      setTransactions(data);
    } catch (err) {
      console.error('Error loading installment transactions:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [refreshTrigger]);

  // Overall 6-month commitments total
  const next6MonthsPrefixes: string[] = [];
  const baseDate = new Date();
  for (let i = 0; i < 6; i++) {
    const d = new Date(baseDate.getFullYear(), baseDate.getMonth() + i, 1);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    next6MonthsPrefixes.push(`${year}-${month}`);
  }

  const installmentTxs = transactions.filter(
    t =>
      t.type === 'expense' &&
      t.installment_total &&
      t.installment_total > 1 &&
      next6MonthsPrefixes.some(p => t.date.startsWith(p))
  );

  const totalCommittedArs = installmentTxs
    .filter(t => t.currency === 'ARS')
    .reduce((sum, t) => sum + Number(t.amount), 0);

  const totalCommittedUsd = installmentTxs
    .filter(t => t.currency === 'USD')
    .reduce((sum, t) => sum + Number(t.amount), 0);

  return (
    <div className="space-y-6">
      {/* Title & Action */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl md:text-2xl font-black text-white tracking-tight flex items-center gap-2">
            <span>Compromisos en Cuotas</span>
          </h2>
          <p className="text-xs text-zinc-400 mt-0.5">
            Cronograma y proyección financiera de tarjetas de crédito
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={loadData}
            disabled={loading}
            className="p-2 text-zinc-400 hover:text-white bg-white/5 hover:bg-white/10 rounded-xl border border-white/5 transition-all disabled:opacity-50"
            title="Recargar"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-emerald-400' : ''}`} />
          </button>
          <button
            onClick={openNewTxModal}
            className="flex items-center gap-2 bg-gradient-to-r from-emerald-500 to-emerald-400 hover:from-emerald-400 hover:to-emerald-300 text-black font-semibold text-xs py-2 px-3.5 rounded-xl shadow-lg shadow-emerald-500/20 transition-all active:scale-95"
          >
            <PlusCircle className="w-4 h-4 stroke-[2.5px]" />
            <span>Nueva Compra</span>
          </button>
        </div>
      </div>

      {/* KPI Commitments Overview */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
        <div className="rounded-2xl bg-[#121216] border border-purple-500/30 p-4 shadow-lg bg-gradient-to-b from-purple-950/20 to-transparent">
          <span className="text-xs font-medium text-purple-300 flex items-center gap-1.5">
            <CreditCard className="w-3.5 h-3.5" />
            Total Comprometido (6 meses)
          </span>
          <div className="mt-2">
            <h3 className="text-2xl font-black text-white">
              {formatCurrency(totalCommittedArs, 'ARS')}
            </h3>
            {totalCommittedUsd > 0 && (
              <p className="text-xs font-bold text-emerald-400 mt-0.5">
                + {formatCurrency(totalCommittedUsd, 'USD')}
              </p>
            )}
          </div>
        </div>

        <div className="rounded-2xl bg-[#121216] border border-white/10 p-4 shadow-lg">
          <span className="text-xs font-medium text-zinc-400">Cuotas Activas</span>
          <div className="mt-2">
            <h3 className="text-2xl font-black text-white">{installmentTxs.length}</h3>
            <p className="text-[11px] text-zinc-400 mt-0.5">
              pagos distribuidos en los próximos 180 días
            </p>
          </div>
        </div>

        <div className="rounded-2xl bg-[#121216] border border-white/10 p-4 shadow-lg flex items-center gap-3">
          <div className="p-3 rounded-xl bg-sky-500/10 text-sky-400 shrink-0">
            <CalendarClock className="w-5 h-5" />
          </div>
          <div className="text-xs">
            <p className="font-semibold text-white">Automatización de cuotas</p>
            <p className="text-zinc-400 mt-0.5 text-[11px]">
              Al ingresar una compra con cuotas, el sistema distribuye automáticamente el gasto mes a mes.
            </p>
          </div>
        </div>
      </div>

      {/* 6-Month Projection Bar Chart */}
      <InstallmentBarChart transactions={transactions} baseDate={baseDate} />

      {/* Itemized monthly breakdown */}
      <div className="pt-2">
        <h3 className="text-sm font-bold text-white tracking-tight mb-3">
          Detalle Mes a Mes
        </h3>
        <MonthlyInstallments transactions={transactions} baseDate={baseDate} />
      </div>
    </div>
  );
}
