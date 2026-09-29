'use client';

import React, { useEffect, useState } from 'react';
import { Transaction, DebtSummary } from '@/lib/supabase/types';
import { fetchTransactions, fetchDebts } from '@/lib/supabase/client';
import { KpiCards } from '@/components/Dashboard/KpiCards';
import { MonthlyBudgetCard } from '@/components/Dashboard/MonthlyBudgetCard';
import { CategoryDonutChart } from '@/components/Dashboard/CategoryDonutChart';
import { PaymentMethodBreakdown } from '@/components/Dashboard/PaymentMethodBreakdown';
import { InstallmentSnapshot } from '@/components/Dashboard/InstallmentSnapshot';
import { RecentTransactions } from '@/components/Dashboard/RecentTransactions';
import { useApp } from '@/components/Layout/AppShell';
import { getCurrentDateISO, formatMonthYear } from '@/lib/utils';
import { PlusCircle, RefreshCw } from 'lucide-react';

export default function DashboardPage() {
  const { openNewTxModal, openEditTxModal, refreshTrigger, triggerRefresh } = useApp();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [debts, setDebts] = useState<DebtSummary[]>([]);
  const [loading, setLoading] = useState(true);

  const todayIso = getCurrentDateISO();
  const currentMonthStr = todayIso.slice(0, 7); // YYYY-MM

  const loadData = async () => {
    setLoading(true);
    try {
      const [txs, dbs] = await Promise.all([fetchTransactions(), fetchDebts()]);
      setTransactions(txs);
      setDebts(dbs);
    } catch (err) {
      console.error('Error loading dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [refreshTrigger]);

  return (
    <div className="space-y-6">
      {/* Top Banner / Welcome */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <span className="inline-block px-2 py-0.5 bg-black text-white font-mono text-[10px] font-black tracking-wider uppercase rounded-md border border-black mb-1">
            [VISTA MENSUAL]
          </span>
          <h2 className="text-xl md:text-2xl font-black text-black tracking-tight">
            Panel General
          </h2>
          <p className="text-xs font-mono font-medium text-zinc-600 mt-0.5">
            Resumen económico correspondiente a{' '}
            <span className="text-black font-bold uppercase underline decoration-2">{formatMonthYear(new Date())}</span>
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={loadData}
            disabled={loading}
            className="p-2 text-black bg-white hover:bg-zinc-100 rounded-xl border-2 border-black shadow-[2px_2px_0px_0px_#000] transition-all active:translate-x-[1px] active:translate-y-[1px] disabled:opacity-50"
            title="Recargar datos"
          >
            <RefreshCw className={`w-4 h-4 stroke-[2.5px] ${loading ? 'animate-spin text-[#FACC15]' : ''}`} />
          </button>
          <button
            onClick={openNewTxModal}
            className="flex items-center gap-2 bg-[#86EFAC] hover:bg-[#4ade80] text-black font-black text-xs py-2 px-3.5 rounded-xl border-2 border-black shadow-[3px_3px_0px_0px_#000] transition-all active:translate-x-[2px] active:translate-y-[2px] active:shadow-[1px_1px_0px_0px_#000]"
          >
            <PlusCircle className="w-4 h-4 stroke-[2.5px]" />
            <span>Nuevo Movimiento</span>
          </button>
        </div>
      </div>

      {/* KPI Metric Cards */}
      <KpiCards
        transactions={transactions}
        debts={debts}
        currentMonthStr={currentMonthStr}
      />

      {/* Monthly Budget Card */}
      <MonthlyBudgetCard
        transactions={transactions}
        currentMonthStr={currentMonthStr}
        onRefresh={triggerRefresh}
      />

      {/* Grid: Category Donut, Payment Method Breakdown & Installments Snapshot */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="flex flex-col gap-6">
          <CategoryDonutChart
            transactions={transactions}
            currentMonthStr={currentMonthStr}
          />
          <PaymentMethodBreakdown
            transactions={transactions}
            currentMonthStr={currentMonthStr}
          />
        </div>
        <div className="flex flex-col gap-6">
          <InstallmentSnapshot transactions={transactions} />
          <RecentTransactions
            transactions={transactions}
            onEdit={openEditTxModal}
            onRefresh={triggerRefresh}
          />
        </div>
      </div>
    </div>
  );
}
