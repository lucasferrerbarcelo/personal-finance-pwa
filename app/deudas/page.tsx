'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { DebtSummary, DebtType, Transaction } from '@/lib/supabase/types';
import { fetchDebts, fetchTransactions, deleteDebt } from '@/lib/supabase/client';
import { DebtCard } from '@/components/Deudas/DebtCard';
import { DebtPaymentModal } from '@/components/Deudas/DebtPaymentModal';
import { NewDebtModal } from '@/components/Deudas/NewDebtModal';
import { CreditCardStatementCard } from '@/components/Dashboard/CreditCardStatementCard';
import { useApp } from '@/components/Layout/AppShell';
import { formatCurrency } from '@/lib/utils';
import {
  HandCoins,
  PlusCircle,
  RefreshCw,
  ArrowDownLeft,
  ArrowUpRight,
  CheckCircle,
  Inbox,
} from 'lucide-react';

export default function DeudasPage() {
  const { openCreditCardsModal, triggerRefresh } = useApp();
  const [debts, setDebts] = useState<DebtSummary[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<DebtType>('owed'); // 'owed' = Me deben, 'owe' = Debo
  const [showSettled, setShowSettled] = useState(false);

  // Modals state
  const [isNewDebtModalOpen, setIsNewDebtModalOpen] = useState(false);
  const [selectedDebtForPayment, setSelectedDebtForPayment] = useState<DebtSummary | null>(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const [dbs, txs] = await Promise.all([fetchDebts(), fetchTransactions()]);
      setDebts(dbs);
      setTransactions(txs);
    } catch (err) {
      console.error('Error loading debts & transactions:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleDeleteDebt = async (debt: DebtSummary) => {
    const isOwed = debt.type === 'owed';
    const detail = isOwed
      ? `te debe ${formatCurrency(debt.remaining_amount, debt.currency)}`
      : `le debés ${formatCurrency(debt.remaining_amount, debt.currency)}`;

    const confirmMsg = `¿Eliminar la deuda de "${debt.person_name}" (${detail})?\n\nEsta acción borrará la deuda y su historial de pagos permanentemente.`;

    if (window.confirm(confirmMsg)) {
      try {
        await deleteDebt(debt.id);
        await loadData();
        triggerRefresh();
      } catch (err: any) {
        console.error('Error al eliminar deuda:', err);
        alert(`Error al eliminar la deuda: ${err?.message || 'Error desconocido'}`);
      }
    }
  };

  // Totals
  const activeDebts = debts.filter(d => d.status === 'active');

  const totalOwedToMeArs = activeDebts
    .filter(d => d.type === 'owed' && d.currency === 'ARS')
    .reduce((sum, d) => sum + Number(d.remaining_amount), 0);

  const totalOwedToMeUsd = activeDebts
    .filter(d => d.type === 'owed' && d.currency === 'USD')
    .reduce((sum, d) => sum + Number(d.remaining_amount), 0);

  const totalIOweArs = activeDebts
    .filter(d => d.type === 'owe' && d.currency === 'ARS')
    .reduce((sum, d) => sum + Number(d.remaining_amount), 0);

  const totalIOweUsd = activeDebts
    .filter(d => d.type === 'owe' && d.currency === 'USD')
    .reduce((sum, d) => sum + Number(d.remaining_amount), 0);

  // Filtered debts for the current view
  const displayDebts = useMemo(() => {
    return debts.filter(d => {
      if (d.type !== activeTab) return false;
      if (!showSettled && (d.status === 'settled' || d.remaining_amount <= 0)) return false;
      return true;
    });
  }, [debts, activeTab, showSettled]);

  return (
    <div className="space-y-6">
      {/* Title & Actions */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <span className="inline-block px-2 py-0.5 bg-black text-white font-mono text-[10px] font-black tracking-wider uppercase rounded-md border border-black mb-1">
            [CONTROL DE SALDOS]
          </span>
          <h2 className="text-xl md:text-2xl font-black text-black tracking-tight">
            Deudas & Préstamos
          </h2>
          <p className="text-xs font-mono font-medium text-zinc-600 mt-0.5">
            Gestión de saldos pendientes a cobrar y pagar
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
            onClick={() => setIsNewDebtModalOpen(true)}
            className="flex items-center gap-2 bg-[#86EFAC] hover:bg-[#4ade80] text-black font-black text-xs py-2 px-3.5 rounded-xl border-2 border-black shadow-[3px_3px_0px_0px_#000] transition-all active:translate-x-[2px] active:translate-y-[2px] active:shadow-[1px_1px_0px_0px_#000]"
          >
            <PlusCircle className="w-4 h-4 stroke-[2.5px]" />
            <span>Nueva Deuda</span>
          </button>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Me deben */}
        <div
          onClick={() => setActiveTab('owed')}
          className={`cursor-pointer rounded-2xl p-5 border-2 border-black transition-all ${
            activeTab === 'owed'
              ? 'bg-[#86EFAC] shadow-[4px_4px_0px_0px_#000]'
              : 'bg-white shadow-[2px_2px_0px_0px_#000] hover:-translate-y-0.5'
          }`}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-white border-2 border-black text-black shadow-[1px_1px_0px_0px_#000]">
                <ArrowDownLeft className="w-5 h-5 stroke-[2.5px]" />
              </div>
              <div>
                <span className="text-xs font-mono font-black uppercase text-black">Me deben (A cobrar)</span>
                <p className="text-[11px] font-mono font-semibold text-zinc-700">Dinero que te tienen que devolver</p>
              </div>
            </div>
            {activeTab === 'owed' && (
              <span className="font-mono font-black text-[10px] bg-black text-white px-2 py-0.5 rounded border border-black">
                ACTIVO
              </span>
            )}
          </div>
          <div className="mt-4">
            <h3 className="text-2xl font-mono font-black tabular-nums text-black">
              {formatCurrency(totalOwedToMeArs, 'ARS')}
            </h3>
            {totalOwedToMeUsd > 0 && (
              <p className="text-sm font-mono font-bold text-emerald-900 mt-1">
                + {formatCurrency(totalOwedToMeUsd, 'USD')}
              </p>
            )}
          </div>
        </div>

        {/* Debo */}
        <div
          onClick={() => setActiveTab('owe')}
          className={`cursor-pointer rounded-2xl p-5 border-2 border-black transition-all ${
            activeTab === 'owe'
              ? 'bg-[#FB923C] shadow-[4px_4px_0px_0px_#000]'
              : 'bg-white shadow-[2px_2px_0px_0px_#000] hover:-translate-y-0.5'
          }`}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-white border-2 border-black text-black shadow-[1px_1px_0px_0px_#000]">
                <ArrowUpRight className="w-5 h-5 stroke-[2.5px]" />
              </div>
              <div>
                <span className="text-xs font-mono font-black uppercase text-black">Debo (A pagar)</span>
                <p className="text-[11px] font-mono font-semibold text-zinc-700">Tus compromisos con personas o servicios</p>
              </div>
            </div>
            {activeTab === 'owe' && (
              <span className="font-mono font-black text-[10px] bg-black text-white px-2 py-0.5 rounded border border-black">
                ACTIVO
              </span>
            )}
          </div>
          <div className="mt-4">
            <h3 className="text-2xl font-mono font-black tabular-nums text-black">
              {formatCurrency(totalIOweArs, 'ARS')}
            </h3>
            {totalIOweUsd > 0 && (
              <p className="text-sm font-mono font-bold text-black mt-1">
                + {formatCurrency(totalIOweUsd, 'USD')}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Tabs & Settled Filter Switcher */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white border-2 border-black p-2.5 rounded-2xl shadow-[3px_3px_0px_0px_#000]">
        {/* Tab Switcher */}
        <div className="flex bg-[#F4F1EA] p-1 rounded-xl border-2 border-black gap-1">
          <button
            onClick={() => setActiveTab('owed')}
            className={`px-4 py-2 text-xs font-bold rounded-lg transition-all border ${
              activeTab === 'owed'
                ? 'bg-[#86EFAC] text-black font-black border-black shadow-[1px_1px_0px_0px_#000]'
                : 'text-zinc-600 border-transparent hover:text-black'
            }`}
          >
            💰 Me deben ({debts.filter(d => d.type === 'owed' && d.status === 'active').length})
          </button>
          <button
            onClick={() => setActiveTab('owe')}
            className={`px-4 py-2 text-xs font-bold rounded-lg transition-all border ${
              activeTab === 'owe'
                ? 'bg-[#FB923C] text-black font-black border-black shadow-[1px_1px_0px_0px_#000]'
                : 'text-zinc-600 border-transparent hover:text-black'
            }`}
          >
            🚨 Debo ({debts.filter(d => d.type === 'owe' && d.status === 'active').length})
          </button>
        </div>

        {/* Toggle Settled Debts */}
        <button
          onClick={() => setShowSettled(!showSettled)}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-mono font-bold border-2 border-black transition-all ${
            showSettled
              ? 'bg-[#FACC15] text-black shadow-[2px_2px_0px_0px_#000]'
              : 'text-zinc-700 hover:text-black bg-white shadow-[1px_1px_0px_0px_#000]'
          }`}
        >
          <CheckCircle className="w-3.5 h-3.5 stroke-[2.5px]" />
          <span>{showSettled ? 'Ocultar saldadas' : 'Ver saldadas'}</span>
        </button>
      </div>

      {/* Credit Card Statement Card when viewing debts */}
      {activeTab === 'owe' && (
        <CreditCardStatementCard
          transactions={transactions}
          onRefresh={loadData}
          onOpenSettings={openCreditCardsModal}
        />
      )}

      {/* Debts Grid */}
      {displayDebts.length === 0 ? (
        <div className="rounded-2xl bg-white border-2 border-black p-12 text-center shadow-[3px_3px_0px_0px_#000]">
          <div className="w-12 h-12 rounded-xl bg-[#FACC15] border-2 border-black flex items-center justify-center mx-auto text-black mb-3 shadow-[2px_2px_0px_0px_#000]">
            <Inbox className="w-6 h-6 stroke-[2.5px]" />
          </div>
          <h4 className="text-sm font-black text-black">No hay deudas registradas</h4>
          <p className="text-xs font-mono font-medium text-zinc-600 mt-1 max-w-sm mx-auto">
            {activeTab === 'owed'
              ? '¡Excelente! Nadie te debe dinero actualmente.'
              : '¡Genial! No tenés compromisos de deuda activos.'}
          </p>
          <button
            onClick={() => setIsNewDebtModalOpen(true)}
            className="mt-4 inline-flex items-center gap-1.5 text-xs font-mono font-bold bg-[#86EFAC] text-black px-3 py-1.5 rounded-xl border-2 border-black shadow-[2px_2px_0px_0px_#000] active:translate-x-[1px] active:translate-y-[1px]"
          >
            <PlusCircle className="w-4 h-4 stroke-[2.5px]" />
            <span>Registrar nueva deuda</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {displayDebts.map(debt => (
            <DebtCard
              key={debt.id}
              debt={debt}
              onOpenPaymentModal={d => setSelectedDebtForPayment(d)}
              onDeleteDebt={handleDeleteDebt}
            />
          ))}
        </div>
      )}

      {/* New Debt Modal */}
      <NewDebtModal
        isOpen={isNewDebtModalOpen}
        onClose={() => setIsNewDebtModalOpen(false)}
        onSuccess={() => {
          loadData();
          triggerRefresh();
        }}
        initialType={activeTab}
      />

      {/* Log Payment Modal */}
      <DebtPaymentModal
        isOpen={Boolean(selectedDebtForPayment)}
        onClose={() => setSelectedDebtForPayment(null)}
        onSuccess={() => {
          loadData();
          triggerRefresh();
        }}
        debt={selectedDebtForPayment}
      />
    </div>
  );
}
