'use client';

import React from 'react';
import { PaymentMethod } from '@/lib/supabase/types';
import { Banknote, CreditCard, ArrowLeftRight, HelpCircle } from 'lucide-react';

interface PaymentMethodBadgeProps {
  method?: PaymentMethod | null;
  compact?: boolean;
  className?: string;
}

export function getPaymentMethodConfig(method?: PaymentMethod | null) {
  switch (method) {
    case 'efectivo':
      return {
        label: 'Efectivo',
        icon: Banknote,
        emoji: '💵',
        colorClass: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
      };
    case 'tarjeta_credito':
      return {
        label: 'Crédito',
        icon: CreditCard,
        emoji: '💳',
        colorClass: 'text-purple-400 bg-purple-500/10 border-purple-500/20',
      };
    case 'tarjeta_debito':
      return {
        label: 'Débito',
        icon: CreditCard,
        emoji: '💳',
        colorClass: 'text-blue-400 bg-blue-500/10 border-blue-500/20',
      };
    case 'transferencia':
      return {
        label: 'Transferencia',
        icon: ArrowLeftRight,
        emoji: '📱',
        colorClass: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
      };
    case 'otro':
    default:
      return {
        label: 'Otro',
        icon: HelpCircle,
        emoji: '🔄',
        colorClass: 'text-zinc-400 bg-zinc-500/10 border-zinc-500/20',
      };
  }
}

export function PaymentMethodBadge({
  method = 'transferencia',
  compact = false,
  className = '',
}: PaymentMethodBadgeProps) {
  const config = getPaymentMethodConfig(method);
  const Icon = config.icon;

  return (
    <span
      className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium border ${config.colorClass} ${className}`}
      title={`Método: ${config.label}`}
    >
      <Icon className="w-2.5 h-2.5" />
      {!compact && <span>{config.label}</span>}
    </span>
  );
}
