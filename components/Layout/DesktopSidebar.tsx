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
}

export function DesktopSidebar({ onOpenNewTxModal }: DesktopSidebarProps) {
  const pathname = usePathname();
  const hasSupabase = isSupabaseConfigured();

  return (
    <aside className="hidden md:flex flex-col w-64 border-r border-white/10 bg-[#0c0c10] h-screen fixed left-0 top-0 z-30 p-5 select-none">
      {/* Brand Header */}
      <div className="flex items-center gap-3 px-2 py-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center shadow-lg shadow-emerald-500/20 text-black font-extrabold text-xl">
          $
        </div>
        <div>
          <h1 className="text-base font-bold text-white tracking-tight flex items-center gap-1.5">
            Finance<span className="text-emerald-400">PWA</span>
          </h1>
          <p className="text-[11px] text-zinc-400">Personal & Mobile Tracker</p>
        </div>
      </div>

      {/* Quick Action Button */}
      {onOpenNewTxModal && (
        <button
          onClick={onOpenNewTxModal}
          className="w-full mb-6 flex items-center justify-center gap-2 bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-black font-semibold text-sm py-2.5 px-4 rounded-xl shadow-lg shadow-emerald-500/25 transition-all transform active:scale-95"
        >
          <PlusCircle className="w-4 h-4 stroke-[2.5px]" />
          <span>Nuevo Movimiento</span>
        </button>
      )}

      {/* Navigation items */}
      <div className="space-y-1.5 flex-1">
        <p className="px-3 text-[10px] font-semibold uppercase tracking-wider text-zinc-400 mb-2">
          Navegación
        </p>
        {NAV_ITEMS.map(item => {
          const isActive = pathname === item.href;
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-3.5 py-3 rounded-xl transition-all ${
                isActive
                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-medium'
                  : 'text-zinc-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <Icon className={`w-5 h-5 ${isActive ? 'stroke-[2.2px]' : 'stroke-[1.8px]'}`} />
              <div>
                <p className="text-sm tracking-tight leading-none">{item.name}</p>
                <p className="text-[11px] text-zinc-400 mt-1">{item.desc}</p>
              </div>
            </Link>
          );
        })}
      </div>

      {/* Status Footer */}
      <div className="border-t border-white/10 pt-4 mt-auto">
        <div className="flex items-center justify-between text-xs px-2 py-1.5 rounded-lg bg-white/5">
          <div className="flex items-center gap-2">
            <Database className="w-3.5 h-3.5 text-zinc-400" />
            <span className="text-zinc-300 text-[11px]">Supabase</span>
          </div>
          <span
            className={`inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full ${
              hasSupabase
                ? 'bg-emerald-500/20 text-emerald-300'
                : 'bg-amber-500/20 text-amber-300'
            }`}
          >
            <span
              className={`w-1.5 h-1.5 rounded-full ${
                hasSupabase ? 'bg-emerald-400' : 'bg-amber-400'
              }`}
            />
            {hasSupabase ? 'Conectado' : 'Demo Local'}
          </span>
        </div>
      </div>
    </aside>
  );
}
