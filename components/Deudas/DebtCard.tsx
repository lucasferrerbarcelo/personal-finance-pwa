'use client';

import React, { useState } from 'react';
import { DebtSummary } from '@/lib/supabase/types';
import { formatCurrency, formatDate } from '@/lib/utils';
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
      className={`rounded-2xl bg-white border-2 border-black p-5 shadow-[3px_3px_0px_0px_#000] transition-all text-black ${
        isSettled ? 'bg-[#F4F1EA]/60' : ''
      }`}
    >
      {/* Top row: Person & Status */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div
            className={`w-10 h-10 border-2 border-black rounded-xl flex items-center justify-center font-bold text-sm shadow-[1px_1px_0px_0px_#000] ${
              isSettled
                ? 'bg-zinc-200 text-black'
                : isOwedToMe
                ? 'bg-[#86EFAC] text-black'
                : 'bg-[#FB923C] text-black'
            }`}
          >
            <User className="w-5 h-5 stroke-[2.5px]" />
          </div>
          <div>
            <h4 className="text-sm font-black text-black tracking-tight flex items-center gap-2">
              {debt.person_name}
              {isSettled && (
                <span className="inline-flex items-center gap-1 text-[10px] font-mono font-black text-black bg-[#86EFAC] px-2 py-0.5 rounded border border-black shadow-[1px_1px_0px_0px_#000]">
                  <CheckCircle2 className="w-3 h-3 stroke-[2.5px]" />
                  SALDADA
                </span>
              )}
            </h4>
            <p className="text-[11px] font-mono font-medium text-zinc-600 mt-0.5">
              {debt.note || (isOwedToMe ? 'Préstamo otorgado' : 'Deuda contraída')} • {formatDate(debt.created_at.split('T')[0], { short: true })}
            </p>
          </div>
        </div>

        <span className="font-mono font-black text-[10px] px-2 py-0.5 bg-[#F4F1EA] text-black border border-black rounded shadow-[1px_1px_0px_0px_#000]">
          {debt.currency}
        </span>
      </div>

      {/* Amounts breakdown */}
      <div className="grid grid-cols-2 gap-3 mt-4 pt-3 border-t-2 border-black/10">
        <div>
          <span className="text-[11px] font-mono font-bold uppercase text-zinc-600 block">Saldo Restante</span>
          <span
            className={`text-lg font-mono font-black tabular-nums tracking-tight ${
              isSettled
                ? 'text-zinc-400 line-through'
                : isOwedToMe
                ? 'text-emerald-700'
                : 'text-rose-700'
            }`}
          >
            {formatCurrency(debt.remaining_amount, debt.currency)}
          </span>
        </div>

        <div className="text-right">
          <span className="text-[11px] font-mono font-bold uppercase text-zinc-600 block">Total Original</span>
          <span className="text-sm font-mono font-bold tabular-nums text-black">
            {formatCurrency(debt.total_amount, debt.currency)}
          </span>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="mt-3">
        <div className="flex items-center justify-between text-[11px] font-mono font-bold text-zinc-700 mb-1.5">
          <span>Pagado: {formatCurrency(debt.total_paid, debt.currency)}</span>
          <span className="font-black text-black">{clampedProgress.toFixed(0)}%</span>
        </div>
        <div className="w-full h-3 rounded-full bg-[#F4F1EA] border-2 border-black overflow-hidden shadow-inner">
          <div
            className={`h-full border-r-2 border-black transition-all duration-500 ${
              isSettled
                ? 'bg-[#86EFAC]'
                : isOwedToMe
                ? 'bg-[#86EFAC]'
                : 'bg-[#FB923C]'
            }`}
            style={{ width: `${clampedProgress}%` }}
          />
        </div>
      </div>

      {/* Action Buttons */}
      <div className="mt-4 pt-3 border-t-2 border-black/10 flex items-center justify-between gap-2">
        {/* Toggle payments history */}
        <button
          onClick={() => setShowHistory(!showHistory)}
          className="flex items-center gap-1.5 text-xs font-mono font-bold text-black hover:underline transition-colors"
        >
          <History className="w-3.5 h-3.5 stroke-[2.5px]" />
          <span>{debt.payments?.length || 0} pagos</span>
          {showHistory ? <ChevronUp className="w-3.5 h-3.5 stroke-[2.5px]" /> : <ChevronDown className="w-3.5 h-3.5 stroke-[2.5px]" />}
        </button>

        {/* Register payment button */}
        {!isSettled && (
          <button
            onClick={() => onOpenPaymentModal(debt)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-black bg-[#86EFAC] hover:bg-[#4ade80] text-black border-2 border-black shadow-[2px_2px_0px_0px_#000] transition-all active:translate-x-[1px] active:translate-y-[1px]"
          >
            <Plus className="w-3.5 h-3.5 stroke-[3px]" />
            <span>Registrar Pago</span>
          </button>
        )}
      </div>

      {/* Payments History Accordion */}
      {showHistory && (
        <div className="mt-3 pt-3 border-t-2 border-black/10 space-y-2">
          <p className="text-[10px] font-mono font-black uppercase tracking-wider text-zinc-600">
            Historial de abonos
          </p>
          {(!debt.payments || debt.payments.length === 0) ? (
            <p className="text-xs font-mono text-zinc-500 italic">No se han registrado pagos aún.</p>
          ) : (
            <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
              {debt.payments.map((p, idx) => (
                <div
                  key={p.id || idx}
                  className="flex items-center justify-between text-xs bg-[#F4F1EA] border border-black p-2 rounded-lg"
                >
                  <div>
                    <span className="font-mono font-black text-black">
                      {formatCurrency(p.amount, debt.currency)}
                    </span>
                    {p.note && <span className="text-zinc-600 text-[11px] block">{p.note}</span>}
                  </div>
                  <span className="text-[11px] font-mono font-bold text-zinc-600">{formatDate(p.date, { short: true })}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
