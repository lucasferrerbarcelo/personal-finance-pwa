'use client';

import React, { useState } from 'react';
import { Transaction } from '@/lib/supabase/types';
import { formatCurrency, formatDate } from '@/lib/utils';
import { CategoryIcon } from '../UI/CategoryIcon';
import { PaymentMethodBadge } from '../UI/PaymentMethodBadge';
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
      <div className="rounded-2xl bg-white border-2 border-black p-12 text-center shadow-[3px_3px_0px_0px_#000]">
        <div className="w-12 h-12 rounded-xl bg-[#FACC15] border-2 border-black flex items-center justify-center mx-auto text-black mb-3 shadow-[2px_2px_0px_0px_#000]">
          <Inbox className="w-6 h-6 stroke-[2.5px]" />
        </div>
        <h4 className="text-sm font-black text-black">No se encontraron movimientos</h4>
        <p className="text-xs font-mono font-medium text-zinc-600 mt-1 max-w-sm mx-auto">
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
            className="rounded-2xl bg-white border-2 border-black overflow-hidden shadow-[3px_3px_0px_0px_#000]"
          >
            {/* Group Header */}
            <div className="px-4 py-2.5 bg-[#F4F1EA] border-b-2 border-black flex items-center justify-between text-xs">
              <span className="font-mono font-black text-black uppercase tracking-wider">
                {formatDate(dateStr, { includeYear: true })}
              </span>
              {dayTotalExpenseArs > 0 && (
                <span className="font-mono font-bold text-xs bg-white px-2 py-0.5 border border-black rounded shadow-[1px_1px_0px_0px_#000] text-black">
                  Total día: {formatCurrency(dayTotalExpenseArs, 'ARS')}
                </span>
              )}
            </div>

            {/* List */}
            <div className="divide-y-2 divide-black/10">
              {dayTxs.map(tx => {
                const isExpense = tx.type === 'expense';
                const isInstallment = tx.installment_total && tx.installment_total > 1;
                const catName = tx.category?.name || 'General';

                return (
                  <div
                    key={tx.id}
                    className="p-3.5 flex items-center justify-between gap-3 group hover:bg-[#F4F1EA]/50 transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 border-2 border-black rounded-xl bg-amber-100 flex items-center justify-center shrink-0 shadow-[1px_1px_0px_0px_#000]">
                        <CategoryIcon
                          name={tx.category?.icon}
                          color="#000000"
                          size={20}
                          className="w-5 h-5 text-black"
                        />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-black truncate">
                          {tx.note || catName}
                        </p>
                        <div className="flex flex-wrap items-center gap-1.5 mt-1 text-[11px]">
                          <span className="px-1.5 py-0.2 text-[10px] font-mono font-bold bg-[#F4F1EA] text-black border border-black rounded">
                            [{catName}]
                          </span>
                          <PaymentMethodBadge method={tx.payment_method} compact />
                          {isInstallment && (
                            <span className="inline-flex items-center gap-1 text-[10px] font-mono font-bold text-black bg-[#C084FC] px-1.5 py-0.2 rounded border border-black shadow-[1px_1px_0px_0px_#000]">
                              <CreditCard className="w-2.5 h-2.5 stroke-[2.5px]" />
                              Cuota {tx.installment_current}/{tx.installment_total}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2.5 shrink-0">
                      <div className="text-right">
                        <p
                          className={`font-mono font-bold text-lg tabular-nums tracking-tight ${
                            isExpense ? 'text-black' : 'text-emerald-700'
                          }`}
                        >
                          {isExpense ? '-' : '+'}
                          {formatCurrency(tx.amount, tx.currency)}
                        </p>
                        {tx.currency === 'USD' && (
                          <span className="inline-block px-1 py-0.2 bg-[#86EFAC] text-black font-mono font-bold text-[9px] border border-black rounded">
                            USD
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-1 pl-1">
                        <button
                          onClick={() => onEdit(tx)}
                          className="p-1.5 text-black hover:bg-[#FACC15] border border-black rounded-lg transition-colors shadow-[1px_1px_0px_0px_#000] active:translate-x-[1px] active:translate-y-[1px]"
                          title="Editar"
                        >
                          <Pencil className="w-3.5 h-3.5 stroke-[2.5px]" />
                        </button>
                        <button
                          onClick={() => handleDelete(tx.id, tx.note)}
                          disabled={deletingId === tx.id}
                          className="p-1.5 text-black hover:bg-[#FB923C] border border-black rounded-lg transition-colors shadow-[1px_1px_0px_0px_#000] active:translate-x-[1px] active:translate-y-[1px] disabled:opacity-50"
                          title="Eliminar"
                        >
                          <Trash2 className="w-3.5 h-3.5 stroke-[2.5px]" />
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
