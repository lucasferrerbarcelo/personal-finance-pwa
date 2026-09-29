'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  ArrowLeftRight,
  HandCoins,
  CalendarClock,
  PlusCircle,
  Database,
  Sparkles,
  CreditCard,
} from 'lucide-react';
import { isSupabaseConfigured } from '@/lib/supabase/client';

const NAV_ITEMS = [
  {
    name: 'Dashboard',
    href: '/',
    icon: LayoutDashboard,
    desc: 'Métricas y balance',
  },
  {
    name: 'Movimientos',
    href: '/movimientos',
    icon: ArrowLeftRight,
    desc: 'Ingresos y gastos',
  },
  {
    name: 'Deudas',
    href: '/deudas',
    icon: HandCoins,
    desc: 'Me deben y debo',
  },
  {
    name: 'Cuotas',
    href: '/cuotas',
    icon: CalendarClock,
    desc: 'Proyección 6 meses',
  },
];

interface DesktopSidebarProps {
  onOpenNewTxModal?: () => void;
  onOpenCreditCardsModal?: () => void;
}

export function DesktopSidebar({ onOpenNewTxModal, onOpenCreditCardsModal }: DesktopSidebarProps) {
  const pathname = usePathname();
  const hasSupabase = isSupabaseConfigured();

  return (
    <aside className="hidden md:flex flex-col w-64 border-r-2 border-black bg-white h-screen fixed left-0 top-0 z-30 p-5 select-none text-black">
      {/* Brand Header */}
      <div className="flex items-center gap-3 px-1 py-2 mb-6">
        <div className="w-10 h-10 rounded-xl bg-[#FACC15] border-2 border-black shadow-[2px_2px_0px_0px_#000] flex items-center justify-center shrink-0">
          <div className="w-4 h-4 rounded-full bg-black" />
        </div>
        <div>
          <h1 className="text-lg font-black text-black tracking-tight flex items-center gap-1.5">
            FINANZAS
          </h1>
          <p className="text-[11px] font-mono text-zinc-600 font-semibold uppercase">[Personal Tracker]</p>
        </div>
      </div>

      {/* Quick Action Button */}
      {onOpenNewTxModal && (
        <button
          onClick={onOpenNewTxModal}
          className="w-full mb-6 flex items-center justify-center gap-2 bg-[#86EFAC] hover:bg-[#4ade80] text-black font-black text-sm py-2.5 px-4 rounded-xl border-2 border-black shadow-[3px_3px_0px_0px_#000] transition-all active:translate-x-[2px] active:translate-y-[2px] active:shadow-[1px_1px_0px_0px_#000]"
        >
          <PlusCircle className="w-4 h-4 stroke-[3px]" />
          <span>Nuevo Movimiento</span>
        </button>
      )}

      {/* Navigation items */}
      <div className="space-y-2 flex-1">
        <p className="px-2 text-[10px] font-black uppercase tracking-wider text-zinc-500 mb-2 font-mono">
          [NAVEGACIÓN]
        </p>
        {NAV_ITEMS.map(item => {
          const isActive = pathname === item.href;
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl transition-all ${
                isActive
                  ? 'bg-[#FACC15] text-black border-2 border-black shadow-[3px_3px_0px_0px_#000] font-black'
                  : 'text-zinc-700 hover:text-black hover:bg-black/5 border-2 border-transparent font-bold'
              }`}
            >
              <Icon className={`w-5 h-5 ${isActive ? 'stroke-[2.5px]' : 'stroke-[2px]'}`} />
              <div>
                <p className="text-sm tracking-tight leading-none font-bold">{item.name}</p>
                <p className="text-[10px] opacity-70 mt-1">{item.desc}</p>
              </div>
            </Link>
          );
        })}

        {/* Tarjetas de Crédito Configuration */}
        {onOpenCreditCardsModal && (
          <button
            onClick={onOpenCreditCardsModal}
            className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl transition-all text-zinc-700 hover:text-black hover:bg-[#FB923C]/20 border-2 border-transparent font-bold text-left mt-2"
          >
            <CreditCard className="w-5 h-5 stroke-[2px] text-amber-700" />
            <div>
              <p className="text-sm tracking-tight leading-none font-bold">Tarjetas</p>
              <p className="text-[10px] opacity-70 mt-1">Cierre y vencimiento</p>
            </div>
          </button>
        )}
      </div>

      {/* Status Footer */}
      <div className="border-t-2 border-black pt-4 mt-auto">
        <div className="flex items-center justify-between text-xs px-2.5 py-2 rounded-xl bg-[#F4F1EA] border-2 border-black shadow-[2px_2px_0px_0px_#000]">
          <div className="flex items-center gap-2">
            <Database className="w-3.5 h-3.5 text-black stroke-[2.5px]" />
            <span className="text-black font-bold text-[11px]">Supabase</span>
          </div>
          <span
            className={`inline-flex items-center gap-1 text-[10px] font-mono font-bold px-2 py-0.5 rounded-md border border-black ${
              hasSupabase
                ? 'bg-[#86EFAC] text-black'
                : 'bg-[#FEF08A] text-black'
            }`}
          >
            <span
              className="w-1.5 h-1.5 rounded-full bg-black"
            />
            {hasSupabase ? 'ONLINE' : 'LOCAL'}
          </span>
        </div>
      </div>
    </aside>
  );
}
