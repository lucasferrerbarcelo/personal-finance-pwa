'use client';

import React, { useState } from 'react';
import { Modal } from '../UI/Modal';
import { Currency, DebtType } from '@/lib/supabase/types';
import { createDebt } from '@/lib/supabase/client';
import { Check, User, DollarSign, FileText } from 'lucide-react';

interface NewDebtModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  initialType?: DebtType;
}

export function NewDebtModal({
  isOpen,
  onClose,
  onSuccess,
  initialType = 'owed',
}: NewDebtModalProps) {
  const [type, setType] = useState<DebtType>(initialType);
  const [personName, setPersonName] = useState('');
  const [totalAmount, setTotalAmount] = useState('');
  const [currency, setCurrency] = useState<Currency>('ARS');
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const amount = parseFloat(totalAmount);
    if (isNaN(amount) || amount <= 0) {
      setError('Ingresá un monto válido mayor a 0');
      return;
    }
    if (!personName.trim()) {
      setError('Ingresá el nombre de la persona');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await createDebt({
        type,
        person_name: personName.trim(),
        total_amount: amount,
        currency,
        note: note.trim() || null,
      });

      onSuccess();
      onClose();
      setPersonName('');
      setTotalAmount('');
      setNote('');
    } catch (err: any) {
      console.error('Error creating debt:', err);
      setError(err?.message || 'Error al guardar la deuda');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Nueva Deuda o Préstamo"
      subtitle="Registrá dinero prestado o por pagar"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 text-xs bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-xl">
            {error}
          </div>
        )}

        {/* Type toggle */}
        <div className="grid grid-cols-2 gap-1.5 p-1 bg-white/5 rounded-xl border border-white/5">
          <button
            type="button"
            onClick={() => setType('owed')}
            className={`py-2 text-xs font-semibold rounded-lg transition-all ${
              type === 'owed'
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 shadow-sm'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            💰 Me deben (A cobrar)
          </button>
          <button
            type="button"
            onClick={() => setType('owe')}
            className={`py-2 text-xs font-semibold rounded-lg transition-all ${
              type === 'owe'
                ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30 shadow-sm'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            🚨 Debo (A pagar)
          </button>
        </div>

        {/* Person Name */}
        <div>
          <label className="block text-xs font-medium text-zinc-400 mb-1.5 flex items-center gap-1">
            <User className="w-3.5 h-3.5" />
            Persona o Entidad
          </label>
          <input
            type="text"
            required
            value={personName}
            onChange={e => setPersonName(e.target.value)}
            placeholder="Ej: Juan Perez / Carlos Mecánico"
            className="w-full bg-zinc-900 border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-emerald-500/50"
          />
        </div>

        {/* Amount & Currency */}
        <div>
          <label className="block text-xs font-medium text-zinc-400 mb-1.5">Monto Total</label>
          <div className="flex rounded-xl bg-white/5 border border-white/10 overflow-hidden focus-within:border-emerald-500/50">
            <div className="flex bg-white/5 p-1 border-r border-white/10 shrink-0">
              <button
                type="button"
                onClick={() => setCurrency('ARS')}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
                  currency === 'ARS'
                    ? 'bg-sky-500/20 text-sky-300 border border-sky-500/30'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                ARS ($)
              </button>
              <button
                type="button"
                onClick={() => setCurrency('USD')}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
                  currency === 'USD'
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                USD (U$S)
              </button>
            </div>

            <input
              type="number"
              step="any"
              min="0"
              required
              value={totalAmount}
              onChange={e => setTotalAmount(e.target.value)}
              placeholder="0.00"
              className="w-full bg-transparent px-3 py-2 text-base font-bold text-white placeholder-zinc-600 focus:outline-none"
            />
          </div>
        </div>

        {/* Note */}
        <div>
          <label className="block text-xs font-medium text-zinc-400 mb-1.5 flex items-center gap-1">
            <FileText className="w-3.5 h-3.5" />
            Motivo / Nota opcional
          </label>
          <input
            type="text"
            value={note}
            onChange={e => setNote(e.target.value)}
            placeholder="Ej: Préstamo entradas recital / Reparación auto"
            className="w-full bg-zinc-900 border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-emerald-500/50"
          />
        </div>

        {/* Actions */}
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
            {loading ? 'Guardando...' : 'Crear Registro'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
