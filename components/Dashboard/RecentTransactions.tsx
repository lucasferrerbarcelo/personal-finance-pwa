'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Transaction } from '@/lib/supabase/types';
import { formatCurrency, formatDate } from '@/lib/utils';
import { CategoryIcon } from '../UI/CategoryIcon';
import { PaymentMethodBadge } from '../UI/PaymentMethodBadge';
import { ArrowRight, Pencil, Trash2, CreditCard, Wallet } from 'lucide-react';
import { deleteTransaction } from '@/lib/supabase/client';
import { useTheme } from '@/lib/theme/ThemeContext';

interface RecentTransactionsProps {
  transactions: Transaction[];
  onEdit: (tx: Transaction) => void;
  onRefresh: () => void;
}

export function RecentTransactions({ transactions, onEdit, onRefresh }: RecentTransactionsProps) {
  const { isMinimal } = useTheme();
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
    <div
      className={`rounded-2xl p-5 transition-all ${
        isMinimal
          ? 'bg-white border border-zinc-200 shadow-sm text-zinc-900'
          : 'bg-white border-2 border-black shadow-[3px_3px_0px_0px_#000] text-black'
      }`}
    >
      {/* Header */}
      <div
        className={`flex items-center justify-between pb-4 ${
          isMinimal ? 'border-b border-zinc-100' : 'border-b-2 border-black/10'
        }`}
      >
        <div>
          {isMinimal ? (
            <span className="inline-block px-2 py-0.5 bg-zinc-100 text-zinc-600 font-sans text-xs font-semibold tracking-wider uppercase rounded-md border border-zinc-200/80 mb-1">
              Últimos Movimientos
            </span>
          ) : (
            <span className="inline-block px-2 py-0.5 bg-black text-white font-mono text-[10px] font-black tracking-wider uppercase rounded-md border border-black mb-1">
              [ÚLTIMOS MOVIMIENTOS]
            </span>
          )}
          <h3
            className={`text-base tracking-tight ${
              isMinimal ? 'font-bold text-zinc-900' : 'font-black text-black'
            }`}
          >
            Actividad Reciente
          </h3>
        </div>

        <Link
          href="/movimientos"
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs transition-all ${
            isMinimal
              ? 'bg-zinc-100 hover:bg-zinc-200 text-zinc-800 font-medium border border-zinc-200 shadow-none'
              : 'bg-[#FACC15] hover:bg-[#eab308] text-black border-2 border-black font-black shadow-[2px_2px_0px_0px_#000] active:translate-x-[1px] active:translate-y-[1px]'
          }`}
        >
          <span>Ver todos</span>
          <ArrowRight className="w-3.5 h-3.5 stroke-[2.5px]" />
        </Link>
      </div>

      {/* Feed of individual cards */}
      <div className="space-y-3 mt-4">
        {recent.length === 0 ? (
          <div className="py-8 text-center text-xs font-mono font-bold text-zinc-500 bg-[#F4F1EA] border-2 border-dashed border-black/30 rounded-xl">
            No hay movimientos registrados todavía.
          </div>
        ) : (
          recent.map(tx => {
            const isExpense = tx.type === 'expense';
            const isInstallment = tx.installment_total && tx.installment_total > 1;
            const catName = tx.category?.name || 'General';

            return (
              <div
                key={tx.id}
                className="bg-white border-2 border-black rounded-xl shadow-[2px_2px_0px_0px_#000] p-3.5 flex items-center justify-between gap-3 transition-transform hover:-translate-y-0.5"
              >
                {/* Category Icon & Concept */}
                <div className="flex items-center gap-3 min-w-0">
                  {tx.type === 'income' ? (
                    <div className="w-10 h-10 border-2 border-black rounded-xl bg-[#86EFAC] flex items-center justify-center shrink-0 shadow-[1px_1px_0px_0px_#000]">
                      <Wallet className="w-5 h-5 stroke-[2.5px] text-black" />
                    </div>
                  ) : (
                    <div className="w-10 h-10 border-2 border-black rounded-xl bg-amber-100 flex items-center justify-center shrink-0 shadow-[1px_1px_0px_0px_#000]">
                      <CategoryIcon
                        name={tx.category?.icon}
                        color="#000000"
                        size={20}
                        className="w-5 h-5 text-black"
                      />
                    </div>
                  )}

                  <div className="min-w-0">
                    <p className="text-sm font-bold text-black truncate">
                      {tx.note || catName}
                    </p>
                    <div className="flex flex-wrap items-center gap-1.5 mt-1 text-[11px]">
                      <span className="font-mono text-zinc-600 font-semibold">
                        {formatDate(tx.date, { short: true })}
                      </span>
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

                {/* Monto a la derecha en font-mono font-bold text-lg text-black & Actions */}
                <div className="flex items-center gap-2.5 shrink-0">
                  <div className="text-right">
                    <p
                      className={`font-mono font-bold text-lg tabular-nums tracking-tight ${
                        isExpense ? 'text-black' : 'text-emerald-700 font-black'
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

                  {/* Actions */}
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
          })
        )}
      </div>
    </div>
  );
}
