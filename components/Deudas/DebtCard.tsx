'use client';

import React, { useState } from 'react';
import { DebtSummary } from '@/lib/supabase/types';
import { formatCurrency, formatDate } from '@/lib/utils';
import { CurrencyBadge } from '../UI/CurrencyBadge';
import { Plus, CheckCircle2, ChevronDown, ChevronUp, History, User } from 'lucide-react';

interface DebtCardProps {
  debt: DebtSummary;
  onOpenPaymentModal: (debt: DebtSummary) => void;
}

export function DebtCard({ debt, onOpenPaymentModal }: DebtCardProps) {
  const [showHistory, setShowHistory] = useState(false);

  const isOwedToMe = debt.type === 'owed';
  const isSettled = debt.status === 'settled' || debt.remaining_amount <= 0;
  const progressPercent = debt.total_amount > 0 ? (debt.total_paid / debt.total_amount) * 100 : 0;
  const clampedProgress = Math.min(100, Math.max(0, progressPercent));

  return (
    <div
      className={`rounded-2xl bg-[#121216] border p-5 shadow-lg transition-all ${
        isSettled
          ? 'border-emerald-500/20 bg-emerald-950/10'
          : isOwedToMe
          ? 'border-white/10 hover:border-emerald-500/30'
          : 'border-white/10 hover:border-rose-500/30'
      }`}
    >
      {/* Top row: Person & Status */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div
            className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm ${
              isSettled
                ? 'bg-emerald-500/20 text-emerald-300'
                : isOwedToMe
                ? 'bg-emerald-500/10 text-emerald-400'
                : 'bg-rose-500/10 text-rose-400'
            }`}
          >
            <User className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-white tracking-tight flex items-center gap-2">
              {debt.person_name}
              {isSettled && (
                <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                  <CheckCircle2 className="w-3 h-3" />
                  Saldada
                </span>
              )}
            </h4>
            <p className="text-[11px] text-zinc-400 mt-0.5">
              {debt.note || (isOwedToMe ? 'Préstamo otorgado' : 'Deuda contraída')} • {formatDate(debt.created_at.split('T')[0], { short: true })}
            </p>
          </div>
        </div>

        <CurrencyBadge currency={debt.currency} />
      </div>

      {/* Amounts breakdown */}
      <div className="grid grid-cols-2 gap-3 mt-4 pt-3 border-t border-white/5">
        <div>
          <span className="text-[11px] text-zinc-400 block">Saldo Restante</span>
          <span
            className={`text-lg font-black tracking-tight ${
              isSettled
                ? 'text-zinc-500 line-through'
                : isOwedToMe
                ? 'text-emerald-400'
                : 'text-rose-400'
            }`}
          >
            {formatCurrency(debt.remaining_amount, debt.currency)}
          </span>
        </div>

        <div className="text-right">
          <span className="text-[11px] text-zinc-400 block">Total Original</span>
          <span className="text-sm font-semibold text-zinc-300">
            {formatCurrency(debt.total_amount, debt.currency)}
          </span>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="mt-3">
        <div className="flex items-center justify-between text-[11px] text-zinc-400 mb-1.5">
          <span>Pagado: {formatCurrency(debt.total_paid, debt.currency)}</span>
          <span className="font-semibold text-zinc-300">{clampedProgress.toFixed(0)}%</span>
        </div>
        <div className="w-full h-2 rounded-full bg-white/5 overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ${
              isSettled
                ? 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.5)]'
                : isOwedToMe
                ? 'bg-emerald-500'
                : 'bg-rose-500'
            }`}
            style={{ width: `${clampedProgress}%` }}
          />
        </div>
      </div>

      {/* Action Buttons */}
      <div className="mt-4 pt-3 border-t border-white/5 flex items-center justify-between gap-2">
        {/* Toggle payments history */}
        <button
          onClick={() => setShowHistory(!showHistory)}
          className="flex items-center gap-1.5 text-xs text-zinc-400 hover:text-white transition-colors"
        >
          <History className="w-3.5 h-3.5" />
          <span>{debt.payments?.length || 0} pagos</span>
          {showHistory ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        </button>

        {/* Register payment button */}
        {!isSettled && (
          <button
            onClick={() => onOpenPaymentModal(debt)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 transition-all active:scale-95"
          >
            <Plus className="w-3.5 h-3.5 stroke-[2.5px]" />
            <span>Registrar Pago</span>
          </button>
        )}
      </div>

      {/* Payments History Accordion */}
      {showHistory && (
        <div className="mt-3 pt-3 border-t border-white/5 space-y-2">
          <p className="text-[10px] uppercase tracking-wider text-zinc-400 font-semibold">
            Historial de abonos
          </p>
          {(!debt.payments || debt.payments.length === 0) ? (
            <p className="text-xs text-zinc-500 italic">No se han registrado pagos aún.</p>
          ) : (
            <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
              {debt.payments.map((p, idx) => (
                <div
                  key={p.id || idx}
                  className="flex items-center justify-between text-xs bg-white/5 p-2 rounded-lg"
                >
                  <div>
                    <span className="text-white font-medium">
                      {formatCurrency(p.amount, debt.currency)}
                    </span>
                    {p.note && <span className="text-zinc-400 text-[11px] block">{p.note}</span>}
                  </div>
                  <span className="text-[11px] text-zinc-400">{formatDate(p.date, { short: true })}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
