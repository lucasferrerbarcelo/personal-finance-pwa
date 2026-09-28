'use client';

import React, { useState } from 'react';
import { Modal } from '../UI/Modal';
import { DebtSummary } from '@/lib/supabase/types';
import { addDebtPayment } from '@/lib/supabase/client';
import { formatCurrency, getCurrentDateISO } from '@/lib/utils';
import { Check, Calendar, FileText } from 'lucide-react';
import confetti from 'canvas-confetti';

interface DebtPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  debt: DebtSummary | null;
}

export function DebtPaymentModal({
  isOpen,
  onClose,
  onSuccess,
  debt,
}: DebtPaymentModalProps) {
  const [amount, setAmount] = useState<string>('');
  const [date, setDate] = useState<string>(getCurrentDateISO());
  const [note, setNote] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!debt) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const numAmount = parseFloat(amount);
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
      setError(err?.message || 'Error al registrar el pago');
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
      title="Registrar Pago"
      subtitle={`Deuda con ${debt.person_name} (${debt.type === 'owed' ? 'Me deben' : 'Debo'})`}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 text-xs bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-xl">
            {error}
          </div>
        )}

        {/* Debt Current Status Box */}
        <div className="rounded-xl bg-white/5 border border-white/10 p-3 flex items-center justify-between text-xs">
          <div>
            <span className="text-zinc-400 block">Saldo restante:</span>
            <span className="text-base font-extrabold text-white">
              {formatCurrency(debt.remaining_amount, debt.currency)}
            </span>
          </div>
          <button
            type="button"
            onClick={handlePayFull}
            className="px-2.5 py-1 text-xs font-semibold text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 rounded-lg transition-colors"
          >
            Saldar total
          </button>
        </div>

        {/* Amount Input */}
        <div>
          <label className="block text-xs font-medium text-zinc-400 mb-1.5">Monto a abonar</label>
          <div className="flex rounded-xl bg-white/5 border border-white/10 overflow-hidden focus-within:border-emerald-500/50">
            <span className="px-3.5 py-2 text-xs font-bold text-zinc-400 bg-white/5 border-r border-white/10 flex items-center">
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
              className="w-full bg-transparent px-3 py-2 text-base font-bold text-white placeholder-zinc-600 focus:outline-none"
            />
          </div>
        </div>

        {/* Date & Note */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-1.5 flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5" />
              Fecha
            </label>
            <input
              type="date"
              required
              value={date}
              onChange={e => setDate(e.target.value)}
              className="w-full bg-zinc-900 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500/50"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-1.5 flex items-center gap-1">
              <FileText className="w-3.5 h-3.5" />
              Comprobante / Nota
            </label>
            <input
              type="text"
              value={note}
              onChange={e => setNote(e.target.value)}
              placeholder="Ej: Transferencia MercadoPago"
              className="w-full bg-zinc-900 border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-emerald-500/50"
            />
          </div>
        </div>

        {/* Action Buttons */}
        <div className="pt-2 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-zinc-400 hover:text-white hover:bg-white/5 rounded-xl transition-colors"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={loading}
            className="flex items-center gap-1.5 px-5 py-2 text-xs font-semibold bg-emerald-500 hover:bg-emerald-400 text-black rounded-xl shadow-lg shadow-emerald-500/20 transition-all active:scale-95 disabled:opacity-50"
          >
            <Check className="w-4 h-4 stroke-[2.5px]" />
            {loading ? 'Registrando...' : 'Confirmar Pago'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
