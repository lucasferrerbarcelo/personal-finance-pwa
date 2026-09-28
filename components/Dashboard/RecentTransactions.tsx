'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Transaction } from '@/lib/supabase/types';
import { formatCurrency, formatDate } from '@/lib/utils';
import { CategoryIcon } from '../UI/CategoryIcon';
import { CurrencyBadge } from '../UI/CurrencyBadge';
import { ArrowRight, Pencil, Trash2, CreditCard } from 'lucide-react';
import { deleteTransaction } from '@/lib/supabase/client';

interface RecentTransactionsProps {
  transactions: Transaction[];
  onEdit: (tx: Transaction) => void;
  onRefresh: () => void;
}

export function RecentTransactions({ transactions, onEdit, onRefresh }: RecentTransactionsProps) {
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Take the last 5 transactions
  const recent = [...transactions]
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 5);

  const handleDelete = async (id: string, note: string | null) => {
    if (confirm(`¿Estás seguro de eliminar "${note || 'este movimiento'}"?`)) {
      setDeletingId(id);
      try {
        await deleteTransaction(id);
        onRefresh();
      } catch (err) {
        console.error('Error deleting transaction:', err);
      } finally {
        setDeletingId(null);
      }
    }
  };

  return (
    <div className="rounded-2xl bg-[#121216] border border-white/10 p-5 shadow-lg">
      <div className="flex items-center justify-between pb-4 border-b border-white/5">
        <div>
          <h3 className="text-sm font-bold text-white tracking-tight">Últimos Movimientos</h3>
          <p className="text-xs text-zinc-400">Actividad reciente</p>
        </div>

        <Link
          href="/movimientos"
          className="flex items-center gap-1 text-xs text-emerald-400 hover:text-emerald-300 font-medium transition-colors"
        >
          <span>Ver todos</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      <div className="divide-y divide-white/5 mt-2">
        {recent.length === 0 ? (
          <div className="py-8 text-center text-xs text-zinc-500">
            No hay movimientos registrados todavía.
          </div>
        ) : (
          recent.map(tx => {
            const isExpense = tx.type === 'expense';
            const isInstallment = tx.installment_total && tx.installment_total > 1;

            return (
              <div
                key={tx.id}
                className="py-3 flex items-center justify-between gap-3 group hover:bg-white/[0.02] -mx-2 px-2 rounded-xl transition-colors"
              >
                {/* Category & Concept */}
                <div className="flex items-center gap-3 min-w-0">
                  <CategoryIcon
                    name={tx.category?.icon}
                    color={tx.category?.color}
                    size={18}
                    className="w-10 h-10"
                  />
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-white truncate">
                      {tx.note || tx.category?.name || 'Movimiento'}
                    </p>
                    <div className="flex items-center gap-2 mt-0.5 text-[11px] text-zinc-400">
                      <span>{formatDate(tx.date, { short: true })}</span>
                      {isInstallment && (
                        <span className="inline-flex items-center gap-1 text-[10px] text-purple-300 bg-purple-500/10 px-1.5 py-0.2 rounded border border-purple-500/20">
                          <CreditCard className="w-2.5 h-2.5" />
                          Cuota {tx.installment_current}/{tx.installment_total}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Amount & Actions */}
                <div className="flex items-center gap-3 shrink-0">
                  <div className="text-right">
                    <p
                      className={`text-xs font-bold ${
                        isExpense ? 'text-zinc-200' : 'text-emerald-400'
                      }`}
                    >
                      {isExpense ? '-' : '+'}
                      {formatCurrency(tx.amount, tx.currency)}
                    </p>
                    <CurrencyBadge currency={tx.currency} className="mt-0.5 text-[10px]" />
                  </div>

                  {/* Action buttons (hover or mobile visible) */}
                  <div className="flex items-center gap-1 opacity-70 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => onEdit(tx)}
                      className="p-1.5 text-zinc-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                      title="Editar"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDelete(tx.id, tx.note)}
                      disabled={deletingId === tx.id}
                      className="p-1.5 text-zinc-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors disabled:opacity-50"
                      title="Eliminar"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
