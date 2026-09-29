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
          <div className="p-3 text-xs bg-[#FB923C]/20 border-2 border-black text-black font-bold rounded-xl shadow-[2px_2px_0px_0px_#000]">
            {error}
          </div>
        )}

        {/* Type toggle */}
        <div className="grid grid-cols-2 gap-2 p-1.5 bg-[#F4F1EA] rounded-xl border-2 border-black shadow-[2px_2px_0px_0px_#000]">
          <button
            type="button"
            onClick={() => setType('owed')}
            className={`py-2 text-xs font-black rounded-lg transition-all border-2 ${
              type === 'owed'
                ? 'bg-[#86EFAC] text-black border-black shadow-[2px_2px_0px_0px_#000]'
                : 'bg-white text-black border-transparent hover:border-black/30'
            }`}
          >
            💰 Me deben (A cobrar)
          </button>
          <button
            type="button"
            onClick={() => setType('owe')}
            className={`py-2 text-xs font-black rounded-lg transition-all border-2 ${
              type === 'owe'
                ? 'bg-[#FB923C] text-black border-black shadow-[2px_2px_0px_0px_#000]'
                : 'bg-white text-black border-transparent hover:border-black/30'
            }`}
          >
            🚨 Debo (A pagar)
          </button>
        </div>

        {/* Person Name */}
        <div>
          <label className="text-xs font-mono font-bold text-black uppercase tracking-wider mb-1.5 flex items-center gap-1">
            <User className="w-3.5 h-3.5 stroke-[2.5px]" />
            Persona o Entidad
          </label>
          <input
            type="text"
            required
            value={personName}
            onChange={e => setPersonName(e.target.value)}
            placeholder="Ej: Juan Perez / Carlos Mecánico"
            className="w-full bg-white border-2 border-black rounded-xl px-3 py-2 text-xs font-bold text-black placeholder-zinc-400 shadow-[2px_2px_0px_0px_#000] focus:outline-none"
          />
        </div>

        {/* Amount & Currency */}
        <div>
          <label className="block text-xs font-mono font-bold text-black uppercase tracking-wider mb-1.5">
            Monto Total
          </label>
          <div className="flex rounded-xl bg-white border-2 border-black shadow-[2px_2px_0px_0px_#000] overflow-hidden">
            <div className="flex bg-[#F4F1EA] p-1 border-r-2 border-black shrink-0">
              <button
                type="button"
                onClick={() => setCurrency('ARS')}
                className={`px-3 py-1 text-xs font-mono font-black rounded-lg transition-all border ${
                  currency === 'ARS'
                    ? 'bg-[#60A5FA] text-black border-black shadow-[1px_1px_0px_0px_#000]'
                    : 'text-zinc-600 border-transparent hover:text-black'
                }`}
              >
                ARS ($)
              </button>
              <button
                type="button"
                onClick={() => setCurrency('USD')}
                className={`px-3 py-1 text-xs font-mono font-black rounded-lg transition-all border ${
                  currency === 'USD'
                    ? 'bg-[#86EFAC] text-black border-black shadow-[1px_1px_0px_0px_#000]'
                    : 'text-zinc-600 border-transparent hover:text-black'
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
              className="w-full bg-white px-3 py-2 text-lg font-mono font-black tabular-nums text-black placeholder-zinc-400 focus:outline-none"
            />
          </div>
        </div>

        {/* Note */}
        <div>
          <label className="text-xs font-mono font-bold text-black uppercase tracking-wider mb-1.5 flex items-center gap-1">
            <FileText className="w-3.5 h-3.5 stroke-[2.5px]" />
            Motivo / Nota opcional
          </label>
          <input
            type="text"
            value={note}
            onChange={e => setNote(e.target.value)}
            placeholder="Ej: Préstamo entradas recital / Reparación auto"
            className="w-full bg-white border-2 border-black rounded-xl px-3 py-2 text-xs font-bold text-black placeholder-zinc-400 shadow-[2px_2px_0px_0px_#000] focus:outline-none"
          />
        </div>

        {/* Actions */}
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
            {loading ? 'Guardando...' : 'Crear Registro'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
