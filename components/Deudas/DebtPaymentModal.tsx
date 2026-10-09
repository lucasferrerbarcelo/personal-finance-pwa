'use client';

import React, { useState, useEffect } from 'react';
import { Modal } from '../UI/Modal';
import { DebtSummary, PaymentMethod } from '@/lib/supabase/types';
import { addDebtPayment } from '@/lib/supabase/client';
import { formatCurrency, getCurrentDateISO } from '@/lib/utils';
import { Check, Calendar, FileText, ArrowRightLeft } from 'lucide-react';
import confetti from 'canvas-confetti';

interface DebtPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  debt: DebtSummary | null;
}

const PAYMENT_METHODS: { value: PaymentMethod; label: string; icon: string }[] = [
  { value: 'transferencia', label: 'Transf / MP', icon: '📲' },
  { value: 'efectivo', label: 'Efectivo', icon: '💵' },
  { value: 'tarjeta_debito', label: 'Débito', icon: '💳' },
];

export function DebtPaymentModal({
  isOpen,
  onClose,
  onSuccess,
  debt,
}: DebtPaymentModalProps) {
  const [amount, setAmount] = useState<string>('');
  const [date, setDate] = useState<string>(getCurrentDateISO());
  const [note, setNote] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('transferencia');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (debt) {
      setAmount(String(debt.remaining_amount));
      setError(null);
    }
  }, [debt, isOpen]);

  if (!debt) return null;

  const isOwed = debt.type === 'owed'; // Someone owes me -> Income
  const modalTitle = isOwed ? 'Registrar Cobro' : 'Registrar Pago';
  const modalSubtitle = isOwed
    ? `Cobro de dinero que te debe ${debt.person_name}`
    : `Pago de deuda que le debés a ${debt.person_name}`;
  const amountLabel = isOwed ? 'Monto recibido / cobrado' : 'Monto a abonar';
  const submitButtonText = isOwed ? 'Confirmar Cobro' : 'Confirmar Pago';

  const numAmount = parseFloat(amount) || 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isNaN(numAmount) || numAmount <= 0) {
      setError('Ingresá un monto válido mayor a 0');
      return;
    }

    if (numAmount > debt.remaining_amount) {
      setError(`El monto supera el saldo restante (${formatCurrency(debt.remaining_amount, debt.currency)})`);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await addDebtPayment({
        debt_id: debt.id,
        amount: numAmount,
        date,
        note: note.trim() || null,
        payment_method: paymentMethod,
      });

      // If debt is settled, fire celebration confetti!
      if (res.debt.remaining_amount <= 0) {
        confetti({
          particleCount: 100,
          spread: 70,
          origin: { y: 0.6 },
        });
      }

      onSuccess();
      onClose();
      setAmount('');
      setNote('');
    } catch (err: any) {
      console.error('Error logging debt payment:', err);
      setError(err?.message || 'Error al registrar el movimiento');
    } finally {
      setLoading(false);
    }
  };

  const handlePayFull = () => {
    setAmount(String(debt.remaining_amount));
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={modalTitle}
      subtitle={modalSubtitle}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 text-xs bg-[#FB923C]/20 border-2 border-black text-black font-bold rounded-xl shadow-[2px_2px_0px_0px_#000]">
            {error}
          </div>
        )}

        {/* Debt Current Status Box */}
        <div className="rounded-xl bg-[#F4F1EA] border-2 border-black p-3.5 flex items-center justify-between text-xs shadow-[2px_2px_0px_0px_#000]">
          <div>
            <span className="text-[10px] font-mono font-bold uppercase text-zinc-600 block">Saldo restante:</span>
            <span className="text-base font-mono font-black tabular-nums text-black">
              {formatCurrency(debt.remaining_amount, debt.currency)}
            </span>
          </div>
          <button
            type="button"
            onClick={handlePayFull}
            className="px-2.5 py-1 text-xs font-mono font-bold text-black bg-[#FACC15] hover:bg-[#eab308] border-2 border-black rounded-lg transition-all shadow-[1px_1px_0px_0px_#000] active:translate-x-[1px] active:translate-y-[1px]"
          >
            {isOwed ? 'Cobrar total' : 'Saldar total'}
          </button>
        </div>

        {/* Amount Input */}
        <div>
          <label className="block text-xs font-mono font-bold text-black uppercase tracking-wider mb-1.5">
            {amountLabel}
          </label>
          <div className="flex rounded-xl bg-white border-2 border-black shadow-[2px_2px_0px_0px_#000] overflow-hidden">
            <span className="px-3.5 py-2 text-xs font-mono font-black text-black bg-[#F4F1EA] border-r-2 border-black flex items-center">
              {debt.currency}
            </span>
            <input
              type="number"
              step="any"
              min="0"
              max={debt.remaining_amount}
              required
              value={amount}
              onChange={e => setAmount(e.target.value)}
              placeholder="0.00"
              className="w-full bg-white px-3 py-2 text-lg font-mono font-black tabular-nums text-black placeholder-zinc-400 focus:outline-none"
            />
          </div>
        </div>

        {/* Payment Method Selector */}
        <div>
          <label className="text-xs font-mono font-bold text-black uppercase tracking-wider mb-1.5 flex items-center gap-1">
            <ArrowRightLeft className="w-3.5 h-3.5 stroke-[2.5px]" />
            {isOwed ? 'Método de Cobro (Entra en caja)' : 'Método de Pago (Sale de caja)'}
          </label>
          <div className="grid grid-cols-3 gap-1.5">
            {PAYMENT_METHODS.map(pm => {
              const isSelected = paymentMethod === pm.value;
              const activeColor =
                pm.value === 'transferencia'
                  ? 'bg-[#60A5FA]'
                  : pm.value === 'efectivo'
                  ? 'bg-[#86EFAC]'
                  : 'bg-[#FB923C]';

              return (
                <button
                  key={pm.value}
                  type="button"
                  onClick={() => setPaymentMethod(pm.value)}
                  className={`py-2 px-2 text-xs font-bold rounded-xl border-2 border-black flex items-center justify-center gap-1.5 transition-all ${
                    isSelected
                      ? `${activeColor} text-black shadow-[2px_2px_0px_0px_#000]`
                      : 'bg-white text-zinc-600 border-black/20 hover:border-black hover:text-black'
                  }`}
                >
                  <span className="text-sm">{pm.icon}</span>
                  <span className="text-[11px] font-black">{pm.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Date & Note */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-mono font-bold text-black uppercase tracking-wider mb-1.5 flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 stroke-[2.5px]" />
              Fecha
            </label>
            <input
              type="date"
              required
              value={date}
              onChange={e => setDate(e.target.value)}
              className="w-full bg-white border-2 border-black rounded-xl px-3 py-2 text-xs font-mono font-bold text-black shadow-[2px_2px_0px_0px_#000] focus:outline-none"
            />
          </div>

          <div>
            <label className="text-xs font-mono font-bold text-black uppercase tracking-wider mb-1.5 flex items-center gap-1">
              <FileText className="w-3.5 h-3.5 stroke-[2.5px]" />
              Comprobante / Detalle
            </label>
            <input
              type="text"
              value={note}
              onChange={e => setNote(e.target.value)}
              placeholder="Opcional: comprobante, detalle..."
              className="w-full bg-white border-2 border-black rounded-xl px-3 py-2 text-xs font-bold text-black placeholder-zinc-400 shadow-[2px_2px_0px_0px_#000] focus:outline-none"
            />
          </div>
        </div>

        {/* Automatic Cash Impact Banner */}
        <div
          className={`p-3 rounded-xl border-2 border-black text-xs font-mono font-bold shadow-[2px_2px_0px_0px_#000] flex items-center justify-between ${
            isOwed ? 'bg-[#86EFAC]/40 text-black' : 'bg-[#FB923C]/40 text-black'
          }`}
        >
          <div className="flex items-center gap-2">
            <span className="text-base">{isOwed ? '🟢' : '🔴'}</span>
            <div>
              <span className="font-black uppercase tracking-wider block text-[10px]">
                {isOwed ? 'Impacto automático en caja (Ingreso)' : 'Impacto automático en caja (Egreso)'}
              </span>
              <span className="text-xs font-bold">
                {isOwed ? '+' : '-'}
                {formatCurrency(numAmount || debt.remaining_amount, debt.currency)} vía{' '}
                {PAYMENT_METHODS.find(p => p.value === paymentMethod)?.label || paymentMethod}
              </span>
            </div>
          </div>
          <span className="text-[10px] font-black px-1.5 py-0.5 bg-black text-white rounded border border-black shrink-0">
            {isOwed ? '▲ IN' : '▼ OUT'}
          </span>
        </div>

        {/* Action Buttons */}
        <div className="pt-2 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-bold text-black bg-white hover:bg-zinc-100 border-2 border-black rounded-xl transition-all shadow-[2px_2px_0px_0px_#000] active:translate-x-[1px] active:translate-y-[1px]"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={loading}
            className="flex items-center gap-1.5 px-5 py-2 text-xs font-black bg-[#86EFAC] hover:bg-[#4ade80] text-black border-2 border-black rounded-xl shadow-[3px_3px_0px_0px_#000] transition-all active:translate-x-[2px] active:translate-y-[2px] active:shadow-[1px_1px_0px_0px_#000] disabled:opacity-50"
          >
            <Check className="w-4 h-4 stroke-[3px]" />
            {loading ? 'Registrando...' : submitButtonText}
          </button>
        </div>
      </form>
    </Modal>
  );
}

