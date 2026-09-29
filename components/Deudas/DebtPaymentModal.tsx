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
            Saldar total
          </button>
        </div>

        {/* Amount Input */}
        <div>
          <label className="block text-xs font-mono font-bold text-black uppercase tracking-wider mb-1.5">
            Monto a abonar
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
              Comprobante / Nota
            </label>
            <input
              type="text"
              value={note}
              onChange={e => setNote(e.target.value)}
              placeholder="Ej: Transferencia MercadoPago"
              className="w-full bg-white border-2 border-black rounded-xl px-3 py-2 text-xs font-bold text-black placeholder-zinc-400 shadow-[2px_2px_0px_0px_#000] focus:outline-none"
            />
          </div>
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
            {loading ? 'Registrando...' : 'Confirmar Pago'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
