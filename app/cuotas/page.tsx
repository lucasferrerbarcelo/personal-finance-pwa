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
          <span className="inline-block px-2 py-0.5 bg-black text-white font-mono text-[10px] font-black tracking-wider uppercase rounded-md border border-black mb-1">
            [PROYECCIÓN 6 MESES]
          </span>
          <h2 className="text-xl md:text-2xl font-black text-black tracking-tight flex items-center gap-2">
            <span>Compromisos en Cuotas</span>
          </h2>
          <p className="text-xs font-mono font-medium text-zinc-600 mt-0.5">
            Cronograma y proyección financiera de tarjetas de crédito
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={loadData}
            disabled={loading}
            className="p-2 text-black bg-white hover:bg-zinc-100 rounded-xl border-2 border-black shadow-[2px_2px_0px_0px_#000] transition-all active:translate-x-[1px] active:translate-y-[1px] disabled:opacity-50"
            title="Recargar"
          >
            <RefreshCw className={`w-4 h-4 stroke-[2.5px] ${loading ? 'animate-spin text-[#FACC15]' : ''}`} />
          </button>
          <button
            onClick={openNewTxModal}
            className="flex items-center gap-2 bg-[#86EFAC] hover:bg-[#4ade80] text-black font-black text-xs py-2 px-3.5 rounded-xl border-2 border-black shadow-[3px_3px_0px_0px_#000] transition-all active:translate-x-[2px] active:translate-y-[2px] active:shadow-[1px_1px_0px_0px_#000]"
          >
            <PlusCircle className="w-4 h-4 stroke-[2.5px]" />
            <span>Nueva Compra</span>
          </button>
        </div>
      </div>

      {/* KPI Commitments Overview */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
        <div className="rounded-2xl bg-[#C084FC] border-2 border-black p-4 shadow-[3px_3px_0px_0px_#000] text-black">
          <span className="text-xs font-mono font-black uppercase text-black flex items-center gap-1.5">
            <CreditCard className="w-4 h-4 stroke-[2.5px]" />
            Total Comprometido (6 meses)
          </span>
          <div className="mt-2">
            <h3 className="text-2xl font-mono font-black tabular-nums text-black">
              {formatCurrency(totalCommittedArs, 'ARS')}
            </h3>
            {totalCommittedUsd > 0 && (
              <p className="text-xs font-mono font-bold text-emerald-900 mt-0.5">
                + {formatCurrency(totalCommittedUsd, 'USD')}
              </p>
            )}
          </div>
        </div>

        <div className="rounded-2xl bg-white border-2 border-black p-4 shadow-[3px_3px_0px_0px_#000] text-black">
          <span className="text-xs font-mono font-bold uppercase text-zinc-600">Cuotas Activas</span>
          <div className="mt-2">
            <h3 className="text-2xl font-mono font-black tabular-nums text-black">{installmentTxs.length}</h3>
            <p className="text-[11px] font-mono font-medium text-zinc-600 mt-0.5">
              pagos distribuidos en los próximos 180 días
            </p>
          </div>
        </div>

        <div className="rounded-2xl bg-white border-2 border-black p-4 shadow-[3px_3px_0px_0px_#000] flex items-center gap-3 text-black">
          <div className="p-3 rounded-xl bg-[#60A5FA] border-2 border-black text-black shadow-[1px_1px_0px_0px_#000] shrink-0">
            <CalendarClock className="w-5 h-5 stroke-[2.5px]" />
          </div>
          <div className="text-xs">
            <p className="font-bold text-black">Automatización de cuotas</p>
            <p className="text-zinc-600 font-mono mt-0.5 text-[11px]">
              Al ingresar una compra con cuotas, el sistema distribuye automáticamente el gasto mes a mes.
            </p>
          </div>
        </div>
      </div>

      {/* 6-Month Projection Bar Chart */}
      <InstallmentBarChart transactions={transactions} baseDate={baseDate} />

      {/* Itemized monthly breakdown */}
      <div className="pt-2">
        <h3 className="text-base font-black text-black tracking-tight mb-3">
          Detalle Mes a Mes
        </h3>
        <MonthlyInstallments transactions={transactions} baseDate={baseDate} />
      </div>
    </div>
  );
}
