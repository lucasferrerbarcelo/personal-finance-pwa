import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { Currency } from './supabase/types';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number, currency: Currency = 'ARS'): string {
  const isNegative = amount < 0;
  const absAmount = Math.abs(amount);

  let formatted = '';
  if (currency === 'ARS') {
    formatted = new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS',
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(absAmount);
    // Standardize symbol to "$ "
    formatted = formatted.replace('ARS', '').trim();
    if (!formatted.startsWith('$')) formatted = `$ ${formatted}`;
  } else {
    // USD
    formatted = `U$S ${new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(absAmount)}`;
  }

  return isNegative ? `-${formatted}` : formatted;
}

export function formatDate(dateStr: string, options?: { includeYear?: boolean; short?: boolean }): string {
  if (!dateStr) return '';
  const [year, month, day] = dateStr.split('-').map(Number);
  if (!year || !month || !day) return dateStr;

  const date = new Date(year, month - 1, day);
  const today = new Date();
  const isToday =
    date.getDate() === today.getDate() &&
    date.getMonth() === today.getMonth() &&
    date.getFullYear() === today.getFullYear();

  if (isToday) return 'Hoy';

  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const isYesterday =
    date.getDate() === yesterday.getDate() &&
    date.getMonth() === yesterday.getMonth() &&
    date.getFullYear() === yesterday.getFullYear();

  if (isYesterday) return 'Ayer';

  return date.toLocaleDateString('es-ES', {
    day: 'numeric',
    month: options?.short ? 'short' : 'long',
    year: options?.includeYear ? 'numeric' : undefined,
  });
}

export function formatMonthYear(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  const monthName = d.toLocaleDateString('es-ES', { month: 'long' });
  const year = d.getFullYear();
  return `${monthName.charAt(0).toUpperCase() + monthName.slice(1)} ${year}`;
}

export function getCurrentDateISO(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Calculates dates for recurring installments over consecutive months
 */
export function calculateInstallmentDates(startDateStr: string, totalInstallments: number): string[] {
  const [year, month, day] = startDateStr.split('-').map(Number);
  const result: string[] = [];

  for (let i = 0; i < totalInstallments; i++) {
    const targetDate = new Date(year, month - 1 + i, 1);
    // Clamp to original day or last day of that month
    const daysInTargetMonth = new Date(targetDate.getFullYear(), targetDate.getMonth() + 1, 0).getDate();
    const clampedDay = Math.min(day, daysInTargetMonth);
    const y = targetDate.getFullYear();
    const m = String(targetDate.getMonth() + 1).padStart(2, '0');
    const d = String(clampedDay).padStart(2, '0');
    result.push(`${y}-${m}-${d}`);
  }

  return result;
}
