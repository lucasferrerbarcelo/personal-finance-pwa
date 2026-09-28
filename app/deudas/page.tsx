'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { DebtSummary, DebtType } from '@/lib/supabase/types';
import { fetchDebts } from '@/lib/supabase/client';
import { DebtCard } from '@/components/Deudas/DebtCard';
import { DebtPaymentModal } from '@/components/Deudas/DebtPaymentModal';
import { NewDebtModal } from '@/components/Deudas/NewDebtModal';
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
  const [debts, setDebts] = useState<DebtSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<DebtType>('owed'); // 'owed' = Me deben, 'owe' = Debo
  const [showSettled, setShowSettled] = useState(false);

  // Modals state
  const [isNewDebtModalOpen, setIsNewDebtModalOpen] = useState(false);
  const [selectedDebtForPayment, setSelectedDebtForPayment] = useState<DebtSummary | null>(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await fetchDebts();
      setDebts(data);
    } catch (err) {
      console.error('Error loading debts:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

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
          <h2 className="text-xl md:text-2xl font-black text-white tracking-tight">
            Deudas & Préstamos
          </h2>
          <p className="text-xs text-zinc-400 mt-0.5">
            Gestión de saldos pendientes a cobrar y pagar
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
            onClick={() => setIsNewDebtModalOpen(true)}
            className="flex items-center gap-2 bg-gradient-to-r from-emerald-500 to-emerald-400 hover:from-emerald-400 hover:to-emerald-300 text-black font-semibold text-xs py-2 px-3.5 rounded-xl shadow-lg shadow-emerald-500/20 transition-all active:scale-95"
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
          className={`cursor-pointer rounded-2xl p-5 border transition-all ${
            activeTab === 'owed'
              ? 'bg-emerald-950/20 border-emerald-500/40 shadow-lg shadow-emerald-500/5'
              : 'bg-[#121216] border-white/10 hover:border-white/20'
          }`}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400">
                <ArrowDownLeft className="w-5 h-5" />
              </div>
              <div>
                <span className="text-xs font-semibold text-zinc-300">Me deben (A cobrar)</span>
                <p className="text-[11px] text-zinc-400">Dinero que te tienen que devolver</p>
              </div>
            </div>
            {activeTab === 'owed' && (
              <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]" />
            )}
          </div>
          <div className="mt-4">
            <h3 className="text-2xl font-black text-white">
              {formatCurrency(totalOwedToMeArs, 'ARS')}
            </h3>
            {totalOwedToMeUsd > 0 && (
              <p className="text-sm font-bold text-emerald-400 mt-1">
                + {formatCurrency(totalOwedToMeUsd, 'USD')}
              </p>
            )}
          </div>
        </div>

        {/* Debo */}
        <div
          onClick={() => setActiveTab('owe')}
          className={`cursor-pointer rounded-2xl p-5 border transition-all ${
            activeTab === 'owe'
              ? 'bg-rose-950/20 border-rose-500/40 shadow-lg shadow-rose-500/5'
              : 'bg-[#121216] border-white/10 hover:border-white/20'
          }`}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-rose-500/10 text-rose-400">
                <ArrowUpRight className="w-5 h-5" />
              </div>
              <div>
                <span className="text-xs font-semibold text-zinc-300">Debo (A pagar)</span>
                <p className="text-[11px] text-zinc-400">Tus compromisos con personas o servicios</p>
              </div>
            </div>
            {activeTab === 'owe' && (
              <span className="w-2 h-2 rounded-full bg-rose-400 shadow-[0_0_8px_rgba(244,63,94,0.8)]" />
            )}
          </div>
          <div className="mt-4">
            <h3 className="text-2xl font-black text-white">
              {formatCurrency(totalIOweArs, 'ARS')}
            </h3>
            {totalIOweUsd > 0 && (
              <p className="text-sm font-bold text-rose-400 mt-1">
                + {formatCurrency(totalIOweUsd, 'USD')}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Tabs & Settled Filter Switcher */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-[#121216] border border-white/10 p-2.5 rounded-2xl shadow-lg">
        {/* Tab Switcher */}
        <div className="flex bg-white/5 p-1 rounded-xl border border-white/5">
          <button
            onClick={() => setActiveTab('owed')}
            className={`px-4 py-2 text-xs font-bold rounded-lg transition-all ${
              activeTab === 'owed'
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            💰 Me deben ({debts.filter(d => d.type === 'owed' && d.status === 'active').length})
          </button>
          <button
            onClick={() => setActiveTab('owe')}
            className={`px-4 py-2 text-xs font-bold rounded-lg transition-all ${
              activeTab === 'owe'
                ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            🚨 Debo ({debts.filter(d => d.type === 'owe' && d.status === 'active').length})
          </button>
        </div>

        {/* Toggle Settled Debts */}
        <button
          onClick={() => setShowSettled(!showSettled)}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium border transition-all ${
            showSettled
              ? 'bg-white/15 text-white border-white/20'
              : 'text-zinc-400 hover:text-zinc-200 border-white/5 bg-white/5'
          }`}
        >
          <CheckCircle className="w-3.5 h-3.5" />
          <span>{showSettled ? 'Ocultar saldadas' : 'Ver saldadas'}</span>
        </button>
      </div>

      {/* Debts Grid */}
      {displayDebts.length === 0 ? (
        <div className="rounded-2xl bg-[#121216] border border-white/10 p-12 text-center shadow-lg">
          <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center mx-auto text-zinc-500 mb-3">
            <Inbox className="w-6 h-6 stroke-[1.5px]" />
          </div>
          <h4 className="text-sm font-semibold text-white">No hay deudas registradas</h4>
          <p className="text-xs text-zinc-400 mt-1 max-w-sm mx-auto">
            {activeTab === 'owed'
              ? '¡Excelente! Nadie te debe dinero actualmente.'
              : '¡Genial! No tenés compromisos de deuda activos.'}
          </p>
          <button
            onClick={() => setIsNewDebtModalOpen(true)}
            className="mt-4 inline-flex items-center gap-1.5 text-xs text-emerald-400 hover:text-emerald-300 font-semibold"
          >
            <PlusCircle className="w-4 h-4" />
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
        }}
        initialType={activeTab}
      />

      {/* Log Payment Modal */}
      <DebtPaymentModal
        isOpen={Boolean(selectedDebtForPayment)}
        onClose={() => setSelectedDebtForPayment(null)}
        onSuccess={() => {
          loadData();
        }}
        debt={selectedDebtForPayment}
      />
    </div>
  );
}
