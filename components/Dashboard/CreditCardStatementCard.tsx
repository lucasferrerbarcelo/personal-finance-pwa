'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Transaction, CreditCard } from '@/lib/supabase/types';
import { getDefaultCreditCard, markStatementAsPaid } from '@/lib/creditCards/service';
import { calculateStatementCycle, formatStatementMonthName, StatementCycleInfo } from '@/lib/creditCards/calculator';
import { getCurrentDateISO, formatCurrency } from '@/lib/utils';
import { CreditCard as CardIcon, CheckCircle2, Clock, AlertTriangle, Settings, Check } from 'lucide-react';
import { useTheme } from '@/lib/theme/ThemeContext';

interface CreditCardStatementCardProps {
  transactions: Transaction[];
  onRefresh?: () => void;
  onOpenSettings?: () => void;
}

export function CreditCardStatementCard({
  transactions,
  onRefresh,
  onOpenSettings,
}: CreditCardStatementCardProps) {
  const { isMinimal } = useTheme();
  const [card, setCard] = useState<CreditCard | null>(null);
  const [paying, setPaying] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const todayIso = getCurrentDateISO();

  useEffect(() => {
    getDefaultCreditCard().then(setCard);
  }, []);

  const closingDay = card?.closing_day ?? 24;
  const dueDay = card?.due_day ?? 5;

  // Active statement cycle for today
  const activeCycle = useMemo<StatementCycleInfo>(() => {
    return calculateStatementCycle(todayIso, closingDay, dueDay);
  }, [todayIso, closingDay, dueDay]);

  // Months marked as paid via statement_paid flag or cash payment transaction
  const paidMonthsSet = useMemo(() => {
    const set = new Set<string>();
    transactions.forEach(t => {
      if (t.statement_paid && t.statement_month) {
        set.add(t.statement_month);
      }
      if (t.note && t.note.startsWith('Pago Resumen Tarjeta Crédito - ')) {
        const monthPart = t.note.replace('Pago Resumen Tarjeta Crédito - ', '').trim();
        transactions.forEach(ot => {
          if (ot.statement_month && formatStatementMonthName(ot.statement_month) === monthPart) {
            set.add(ot.statement_month);
          }
        });
      }
    });
    return set;
  }, [transactions]);

  // Unpaid credit card transactions
  const unpaidCreditTransactions = useMemo(() => {
    return transactions.filter(
      t =>
        t.payment_method === 'tarjeta_credito' &&
        t.type === 'expense' &&
        !t.statement_paid &&
        (!t.statement_month || !paidMonthsSet.has(t.statement_month))
    );
  }, [transactions, paidMonthsSet]);

  // Distinct unpaid statement months sorted ascending
  const unpaidMonths = useMemo(() => {
    const monthsSet = new Set<string>();
    unpaidCreditTransactions.forEach(t => {
      if (t.statement_month) monthsSet.add(t.statement_month);
    });
    // Ensure active cycle month is in the set
    monthsSet.add(activeCycle.statementMonth);
    return Array.from(monthsSet).sort();
  }, [unpaidCreditTransactions, activeCycle.statementMonth]);

  // Target month to display (earliest unpaid month or active cycle)
  const [selectedMonth, setSelectedMonth] = useState<string>(activeCycle.statementMonth);

  useEffect(() => {
    // If there is an unpaid month older than or equal to activeCycle, prefer the first unpaid
    const firstWithDebt = unpaidMonths.find(m => {
      const debt = unpaidCreditTransactions
        .filter(t => t.statement_month === m)
        .reduce((sum, t) => sum + Number(t.amount), 0);
      return debt > 0;
    });

    if (firstWithDebt) {
      setSelectedMonth(firstWithDebt);
    } else {
      setSelectedMonth(activeCycle.statementMonth);
    }
  }, [unpaidMonths, activeCycle.statementMonth, unpaidCreditTransactions]);

  // Cycle info for selected month
  const selectedCycleInfo = useMemo(() => {
    const [year, month] = selectedMonth.split('-').map(Number);
    // Approximate purchase date in previous month to reconstruct cycle info
    const prevMonthDate = new Date(year, month - 2, 1);
    const prevYear = prevMonthDate.getFullYear();
    const prevMonth = prevMonthDate.getMonth() + 1;
    const testDate = `${prevYear}-${String(prevMonth).padStart(2, '0')}-01`;
    return calculateStatementCycle(testDate, closingDay, dueDay);
  }, [selectedMonth, closingDay, dueDay]);

  // Total debt for selected statement month
  const totalForSelectedMonth = useMemo(() => {
    return unpaidCreditTransactions
      .filter(t => t.statement_month === selectedMonth)
      .reduce((sum, t) => sum + Number(t.amount), 0);
  }, [unpaidCreditTransactions, selectedMonth]);

  const monthName = formatStatementMonthName(selectedMonth);

  const handlePay = async () => {
    if (totalForSelectedMonth <= 0 || paying) return;

    if (!confirm(`¿Confirmás el pago del resumen de ${monthName} por ${formatCurrency(totalForSelectedMonth, 'ARS')}?\n\nSe registrará el egreso real del dinero en la cuenta y se dará por saldado el período.`)) {
      return;
    }

    setPaying(true);
    setSuccessMsg(null);
    try {
      await markStatementAsPaid(selectedMonth, totalForSelectedMonth, 'ARS');
      setSuccessMsg(`¡Resumen de ${monthName} saldado! Se registró el débito en caja.`);
      setTimeout(() => setSuccessMsg(null), 5000);
      onRefresh?.();
    } catch (err) {
      console.error('Error paying statement:', err);
      alert('Hubo un error al registrar el pago del resumen.');
    } finally {
      setPaying(false);
    }
  };

  return (
    <div
      className={`rounded-2xl p-5 sm:p-6 flex flex-col justify-between transition-all ${
        isMinimal
          ? 'bg-white border border-zinc-200 shadow-sm text-zinc-900'
          : 'bg-[#FB923C] border-2 border-black shadow-[4px_4px_0px_0px_#000] text-black'
      }`}
    >
      <div>
        {/* Header / Badges */}
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            {isMinimal ? (
              <span className="inline-block px-2.5 py-0.5 bg-amber-50 text-amber-800 border border-amber-200/80 font-sans text-xs font-semibold tracking-wider uppercase rounded-md">
                Liquidación de Crédito
              </span>
            ) : (
              <span className="inline-block px-2.5 py-0.5 bg-black text-[#FB923C] font-mono text-[11px] font-black tracking-wider uppercase rounded-md border border-black shadow-[1px_1px_0px_0px_#000]">
                [LIQUIDACIÓN DE CRÉDITO]
              </span>
            )}
            {card && (
              <span
                className={`text-xs px-2 py-0.5 rounded-md border ${
                  isMinimal
                    ? 'font-sans font-medium text-zinc-600 bg-zinc-100 border-zinc-200'
                    : 'font-mono font-bold text-black/80 bg-white/70 border-black'
                }`}
              >
                {card.name}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            {unpaidMonths.length > 1 && (
              <select
                value={selectedMonth}
                onChange={e => setSelectedMonth(e.target.value)}
                className={`rounded-lg px-2 py-0.5 text-xs focus:outline-none ${
                  isMinimal
                    ? 'bg-zinc-50 border border-zinc-200 font-medium text-zinc-800'
                    : 'bg-white border-2 border-black font-mono font-bold text-black shadow-[1px_1px_0px_0px_#000]'
                }`}
              >
                {unpaidMonths.map(m => (
                  <option key={m} value={m}>
                    {formatStatementMonthName(m)}
                  </option>
                ))}
              </select>
            )}

            {onOpenSettings && (
              <button
                onClick={onOpenSettings}
                className={`p-1.5 rounded-lg transition-all ${
                  isMinimal
                    ? 'text-zinc-600 bg-zinc-100 hover:bg-zinc-200 border border-zinc-200'
                    : 'text-black bg-white hover:bg-zinc-100 border-2 border-black shadow-[1px_1px_0px_0px_#000] active:translate-x-[1px] active:translate-y-[1px]'
                }`}
                title="Configurar Cierre y Vencimiento"
              >
                <Settings className="w-3.5 h-3.5 stroke-[2px]" />
              </button>
            )}
          </div>
        </div>

        {/* Title & Amount */}
        <div className="mt-3.5">
          <h3
            className={`text-xs sm:text-sm uppercase tracking-tight flex items-center gap-1.5 ${
              isMinimal ? 'font-semibold text-zinc-600' : 'font-mono font-black text-black'
            }`}
          >
            <span>💳 Resumen de Tarjeta por Vencer ({monthName})</span>
          </h3>

          <div
            className={`mt-2 mb-3 tabular-nums tracking-tight ${
              isMinimal
                ? 'text-3xl sm:text-4xl font-bold font-sans text-zinc-950'
                : 'text-3xl sm:text-4xl font-black font-mono text-black'
            }`}
          >
            {formatCurrency(totalForSelectedMonth, 'ARS')}
          </div>
        </div>

        {/* Dates Info Pill */}
        <div
          className={`inline-flex flex-wrap items-center gap-2 rounded-xl px-3 py-1.5 text-xs mb-4 ${
            isMinimal
              ? 'bg-zinc-50 border border-zinc-200 font-medium text-zinc-600'
              : 'bg-white border-2 border-black shadow-[2px_2px_0px_0px_#000] font-mono font-bold text-black'
          }`}
        >
          <span className="flex items-center gap-1">
            <Clock className="w-3.5 h-3.5 text-amber-600 stroke-[2.5px]" />
            <span>Cierre: día {selectedCycleInfo.closingDay} ({selectedCycleInfo.closingDisplay})</span>
          </span>
          <span className={isMinimal ? 'text-zinc-300' : 'text-black/30'}>|</span>
          <span className="flex items-center gap-1">
            <AlertTriangle className="w-3.5 h-3.5 text-rose-600 stroke-[2.5px]" />
            <span>Vence: día {selectedCycleInfo.dueDay}</span>
          </span>
        </div>
      </div>

      {/* Success Notification */}
      {successMsg && (
        <div
          className={`rounded-xl p-3 mb-3 text-xs flex items-center gap-2 ${
            isMinimal
              ? 'bg-emerald-50 border border-emerald-200 text-emerald-800 font-medium'
              : 'bg-[#86EFAC] border-2 border-black shadow-[2px_2px_0px_0px_#000] font-mono font-bold text-black'
          }`}
        >
          <CheckCircle2 className="w-4 h-4 shrink-0 stroke-[2.5px]" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Action Button */}
      <div
        className={`pt-2 flex flex-wrap items-center justify-between gap-3 ${
          isMinimal ? 'border-t border-zinc-100' : 'border-t-2 border-black/20'
        }`}
      >
        <p className={`text-[11px] ${isMinimal ? 'text-zinc-500' : 'font-mono text-black/80'}`}>
          {totalForSelectedMonth > 0
            ? 'Los consumos no descuentan tu caja hasta que marques el resumen pagado.'
            : '✅ Estás al día con este período. Sin consumos pendientes.'}
        </p>

        {totalForSelectedMonth > 0 && (
          <button
            onClick={handlePay}
            disabled={paying}
            className={`w-full sm:w-auto text-xs sm:text-sm py-2.5 px-4 rounded-xl transition-all flex items-center justify-center gap-2 disabled:opacity-50 ${
              isMinimal
                ? 'bg-zinc-900 hover:bg-zinc-800 text-white font-semibold shadow-sm border border-transparent'
                : 'bg-black hover:bg-zinc-800 text-[#FB923C] font-mono font-black border-2 border-black shadow-[3px_3px_0px_0px_#000] active:translate-x-[2px] active:translate-y-[2px]'
            }`}
          >
            <Check className="w-4 h-4 stroke-[3px]" />
            <span>{paying ? 'Procesando pago...' : 'Marcar resumen pagado'}</span>
          </button>
        )}
      </div>
    </div>
  );
}
