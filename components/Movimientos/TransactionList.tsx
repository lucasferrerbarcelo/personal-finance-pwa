'use client';

import React, { useState } from 'react';
import { Transaction } from '@/lib/supabase/types';
import { formatCurrency, formatDate } from '@/lib/utils';
import { CategoryIcon } from '../UI/CategoryIcon';
import { CurrencyBadge } from '../UI/CurrencyBadge';
import { Pencil, Trash2, CreditCard, Inbox } from 'lucide-react';
import { deleteTransaction } from '@/lib/supabase/client';

interface TransactionListProps {
  transactions: Transaction[];
  onEdit: (tx: Transaction) => void;
  onRefresh: () => void;
}

export function TransactionList({ transactions, onEdit, onRefresh }: TransactionListProps) {
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleDelete = async (id: string, note: string | null) => {
    if (confirm(`¿Eliminar movimiento "${note || 'sin nombre'}"?`)) {
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

  // Group by date string YYYY-MM-DD
  const grouped = transactions.reduce((acc, tx) => {
    const list = acc[tx.date] || [];
    list.push(tx);
    acc[tx.date] = list;
    return acc;
  }, {} as Record<string, Transaction[]>);

  const sortedDates = Object.keys(grouped).sort(
    (a, b) => new Date(b).getTime() - new Date(a).getTime()
  );

  if (transactions.length === 0) {
    return (
      <div className="rounded-2xl bg-[#121216] border border-white/10 p-12 text-center shadow-lg">
        <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center mx-auto text-zinc-500 mb-3">
          <Inbox className="w-6 h-6 stroke-[1.5px]" />
        </div>
        <h4 className="text-sm font-semibold text-white">No se encontraron movimientos</h4>
        <p className="text-xs text-zinc-400 mt-1 max-w-sm mx-auto">
          No hay registros para los filtros seleccionados. Probá cambiando de mes o limpiando la búsqueda.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {sortedDates.map(dateStr => {
        const dayTxs = grouped[dateStr];
        const dayTotalExpenseArs = dayTxs
          .filter(t => t.type === 'expense' && t.currency === 'ARS')
          .reduce((sum, t) => sum + Number(t.amount), 0);

        return (
          <div
            key={dateStr}
            className="rounded-2xl bg-[#121216] border border-white/10 overflow-hidden shadow-lg"
          >
            {/* Group Header */}
            <div className="px-4 py-2.5 bg-white/[0.03] border-b border-white/5 flex items-center justify-between text-xs">
              <span className="font-semibold text-zinc-300">
                {formatDate(dateStr, { includeYear: true })}
              </span>
              {dayTotalExpenseArs > 0 && (
                <span className="text-[11px] font-medium text-zinc-400">
                  Total día: {formatCurrency(dayTotalExpenseArs, 'ARS')}
                </span>
              )}
            </div>

            {/* List */}
            <div className="divide-y divide-white/5">
              {dayTxs.map(tx => {
                const isExpense = tx.type === 'expense';
                const isInstallment = tx.installment_total && tx.installment_total > 1;

                return (
                  <div
                    key={tx.id}
                    className="p-3.5 flex items-center justify-between gap-3 group hover:bg-white/[0.02] transition-colors"
                  >
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
                          <span>{tx.category?.name || 'General'}</span>
                          {isInstallment && (
                            <span className="inline-flex items-center gap-1 text-[10px] text-purple-300 bg-purple-500/10 px-1.5 py-0.5 rounded border border-purple-500/20">
                              <CreditCard className="w-2.5 h-2.5" />
                              Cuota {tx.installment_current}/{tx.installment_total}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

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
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
