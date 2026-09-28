'use client';

import React from 'react';
import { Currency } from '@/lib/supabase/types';

interface CurrencyBadgeProps {
  currency: Currency;
  className?: string;
}

export function CurrencyBadge({ currency, className = '' }: CurrencyBadgeProps) {
  const isUsd = currency === 'USD';

  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-semibold tracking-wide ${
        isUsd
          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
          : 'bg-sky-500/10 text-sky-400 border border-sky-500/20'
      } ${className}`}
    >
      {isUsd ? 'U$S' : 'ARS'}
    </span>
  );
}
