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
        colorClass: 'bg-[#FEF08A] text-black border-2 border-black shadow-[1.5px_1.5px_0px_0px_#000]',
      };
    case 'tarjeta_credito':
      return {
        label: 'Crédito',
        icon: CreditCard,
        emoji: '💳',
        colorClass: 'bg-[#C084FC] text-black border-2 border-black shadow-[1.5px_1.5px_0px_0px_#000]',
      };
    case 'tarjeta_debito':
      return {
        label: 'Débito',
        icon: CreditCard,
        emoji: '💳',
        colorClass: 'bg-[#FB923C] text-black border-2 border-black shadow-[1.5px_1.5px_0px_0px_#000]',
      };
    case 'transferencia':
      return {
        label: 'Transferencia',
        icon: ArrowLeftRight,
        emoji: '📱',
        colorClass: 'bg-[#60A5FA] text-black border-2 border-black shadow-[1.5px_1.5px_0px_0px_#000]',
      };
    case 'otro':
    default:
      return {
        label: 'Otro',
        icon: HelpCircle,
        emoji: '🔄',
        colorClass: 'bg-white text-black border-2 border-black shadow-[1.5px_1.5px_0px_0px_#000]',
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
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold ${config.colorClass} ${className}`}
      title={`Método: ${config.label}`}
    >
      <Icon className="w-3 h-3 stroke-[2.5px]" />
      {!compact && <span>{config.label}</span>}
    </span>
  );
}
