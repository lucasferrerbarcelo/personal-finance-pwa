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
      className={`inline-flex items-center px-1.5 py-0.2 rounded font-mono font-bold text-[10px] tracking-wide border border-black shadow-[1px_1px_0px_0px_#000] ${
        isUsd
          ? 'bg-[#86EFAC] text-black'
          : 'bg-[#60A5FA] text-black'
      } ${className}`}
    >
      {isUsd ? 'U$S' : 'ARS'}
    </span>
  );
}
