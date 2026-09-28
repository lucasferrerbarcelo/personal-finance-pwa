'use client';

import React, { useState, useEffect } from 'react';
import { Modal } from '../UI/Modal';
import { Category, Currency, PaymentMethod, Transaction, TransactionType } from '@/lib/supabase/types';
import { createTransaction, fetchCategories, updateTransaction } from '@/lib/supabase/client';
import { formatCurrency, getCurrentDateISO } from '@/lib/utils';
import { CategoryIcon } from '../UI/CategoryIcon';
import { CreditCard, Calendar, FileText, Check } from 'lucide-react';

const PAYMENT_METHODS: { value: PaymentMethod; label: string; icon: string }[] = [
  { value: 'transferencia', label: 'Transferencia', icon: '📱' },
  { value: 'tarjeta_debito', label: 'Débito', icon: '💳' },
  { value: 'tarjeta_credito', label: 'Crédito', icon: '💳' },
  { value: 'efectivo', label: 'Efectivo', icon: '💵' },
];

interface TransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  transactionToEdit?: Transaction | null;
}

export function TransactionModal({
  isOpen,
  onClose,
  onSuccess,
  transactionToEdit,
}: TransactionModalProps) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [type, setType] = useState<TransactionType>('expense');
  const [amount, setAmount] = useState<string>('');
  const [currency, setCurrency] = useState<Currency>('ARS');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('transferencia');
  const [categoryId, setCategoryId] = useState<string>('');
  const [date, setDate] = useState<string>(getCurrentDateISO());
  const [note, setNote] = useState<string>('');
  const [installments, setInstallments] = useState<number>(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchCategories().then(cats => {
      setCategories(cats);
    });
  }, []);

  useEffect(() => {
    if (transactionToEdit) {
      setType(transactionToEdit.type);
      setAmount(String(transactionToEdit.amount));
      setCurrency(transactionToEdit.currency);
      setPaymentMethod(transactionToEdit.payment_method || 'transferencia');
      setCategoryId(transactionToEdit.category_id || '');
      setDate(transactionToEdit.date);
      setNote(transactionToEdit.note || '');
      setInstallments(transactionToEdit.installment_total || 1);
    } else {
      // Reset defaults
      setType('expense');
      setAmount('');
      setCurrency('ARS');
      setPaymentMethod('transferencia');
      setDate(getCurrentDateISO());
      setNote('');
      setInstallments(1);
      setError(null);
    }
  }, [transactionToEdit, isOpen]);

  // Set default category for selected type
  useEffect(() => {
    if (!categoryId && categories.length > 0) {
      const match = categories.find(c => c.type === type);
      if (match) setCategoryId(match.id);
    }
  }, [type, categories, categoryId]);

  const filteredCategories = categories.filter(c => c.type === type);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      setError('Ingresá un monto válido mayor a 0');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      if (transactionToEdit) {
        await updateTransaction(transactionToEdit.id, {
          type,
          amount: numAmount,
          currency,
          category_id: categoryId || null,
          date,
          note: note.trim() || null,
          payment_method: paymentMethod,
        });
      } else {
        await createTransaction({
          type,
          amount: numAmount,
          currency,
          category_id: categoryId || null,
          date,
          note: note.trim() || null,
          payment_method: paymentMethod,
          installments: type === 'expense' ? installments : 1,
        });
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      console.error('Error saving transaction:', err);
      setError(err?.message || 'Error al guardar el movimiento');
    } finally {
      setLoading(false);
    }
  };

  const parsedAmount = parseFloat(amount) || 0;
  const perInstallmentAmount = installments > 1 ? parsedAmount / installments : parsedAmount;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={transactionToEdit ? 'Editar Movimiento' : 'Nuevo Movimiento'}
      subtitle={transactionToEdit ? 'Modificá los detalles' : 'Registrá un gasto o ingreso'}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 text-xs bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-xl">
            {error}
          </div>
        )}

        {/* Type Toggle: Gasto vs Ingreso */}
        <div className="grid grid-cols-2 gap-1.5 p-1 bg-white/5 rounded-xl border border-white/5">
          <button
            type="button"
            onClick={() => setType('expense')}
            className={`py-2 text-xs font-semibold rounded-lg transition-all ${
              type === 'expense'
                ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30 shadow-sm'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            💸 Gasto
          </button>
          <button
            type="button"
            onClick={() => setType('income')}
            className={`py-2 text-xs font-semibold rounded-lg transition-all ${
              type === 'income'
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 shadow-sm'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            💰 Ingreso
          </button>
        </div>

        {/* Amount & Currency Selector */}
        <div>
          <label className="block text-xs font-medium text-zinc-400 mb-1.5">Monto y Moneda</label>
          <div className="flex rounded-xl bg-white/5 border border-white/10 overflow-hidden focus-within:border-emerald-500/50 transition-colors">
            {/* Currency toggle */}
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
              value={amount}
              onChange={e => setAmount(e.target.value)}
              placeholder="0.00"
              className="w-full bg-transparent px-3 py-2 text-lg font-bold text-white placeholder-zinc-600 focus:outline-none"
            />
          </div>
        </div>

        {/* Category selector */}
        <div>
          <label className="block text-xs font-medium text-zinc-400 mb-1.5">Categoría</label>
          <div className="relative">
            <select
              value={categoryId}
              onChange={e => setCategoryId(e.target.value)}
              className="w-full bg-zinc-900 border border-white/10 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-emerald-500/50 transition-colors appearance-none"
            >
              <option value="">Seleccionar categoría...</option>
              {filteredCategories.map(cat => (
                <option key={cat.id} value={cat.id}>
                  {cat.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Payment Method Selector */}
        <div>
          <label className="block text-xs font-medium text-zinc-400 mb-1.5">Método de Pago</label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
            {PAYMENT_METHODS.map(pm => {
              const isSelected = paymentMethod === pm.value;
              return (
                <button
                  key={pm.value}
                  type="button"
                  onClick={() => setPaymentMethod(pm.value)}
                  className={`py-2 px-2 text-xs font-medium rounded-xl border flex items-center justify-center gap-1.5 transition-all ${
                    isSelected
                      ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 shadow-sm font-semibold'
                      : 'bg-white/5 text-zinc-400 border-white/5 hover:text-zinc-200 hover:bg-white/10'
                  }`}
                >
                  <span className="text-sm">{pm.icon}</span>
                  <span>{pm.label}</span>
                </button>
              );
            })}
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
              className="w-full bg-zinc-900 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500/50 transition-colors"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-1.5 flex items-center gap-1">
              <FileText className="w-3.5 h-3.5" />
              Concepto / Nota
            </label>
            <input
              type="text"
              value={note}
              onChange={e => setNote(e.target.value)}
              placeholder="Ej: Café con medialunas"
              className="w-full bg-zinc-900 border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-emerald-500/50 transition-colors"
            />
          </div>
        </div>

        {/* Installments (Cuotas) - only when creating expense */}
        {type === 'expense' && !transactionToEdit && (
          <div className="bg-white/5 border border-white/10 rounded-xl p-3 space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-medium text-zinc-300 flex items-center gap-1.5">
                <CreditCard className="w-3.5 h-3.5 text-emerald-400" />
                Pago en Cuotas
              </label>
              <select
                value={installments}
                onChange={e => {
                  const val = parseInt(e.target.value, 10);
                  setInstallments(val);
                  if (val > 1 && (paymentMethod === 'efectivo' || paymentMethod === 'transferencia')) {
                    setPaymentMethod('tarjeta_credito');
                  }
                }}
                className="bg-zinc-900 border border-white/15 rounded-lg px-2 py-1 text-xs text-white focus:outline-none"
              >
                <option value={1}>1 cuota (Débito / Contado)</option>
                <option value={2}>2 cuotas</option>
                <option value={3}>3 cuotas</option>
                <option value={6}>6 cuotas</option>
                <option value={9}>9 cuotas</option>
                <option value={12}>12 cuotas</option>
                <option value={18}>18 cuotas</option>
                <option value={24}>24 cuotas</option>
              </select>
            </div>

            {installments > 1 && (
              <div className="text-[11px] text-emerald-400/90 bg-emerald-500/10 border border-emerald-500/20 p-2 rounded-lg flex items-center justify-between">
                <span>
                  💳 {installments} cuotas mensuales de:
                </span>
                <span className="font-bold text-xs text-emerald-300">
                  {formatCurrency(perInstallmentAmount, currency)} / mes
                </span>
              </div>
            )}
          </div>
        )}

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
            {loading ? 'Guardando...' : transactionToEdit ? 'Guardar Cambios' : 'Registrar'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
