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
  CreditCard,
  Palette,
} from 'lucide-react';
import { isSupabaseConfigured } from '@/lib/supabase/client';
import { useTheme } from '@/lib/theme/ThemeContext';

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
  const { theme, toggleTheme, isMinimal } = useTheme();

  return (
    <aside
      className={`hidden md:flex flex-col w-64 h-screen fixed left-0 top-0 z-30 p-5 select-none transition-colors duration-150 ${
        isMinimal
          ? 'border-r border-zinc-200 bg-white text-zinc-900'
          : 'border-r-2 border-black bg-white text-black'
      }`}
    >
      {/* Brand Header */}
      <div className="flex items-center gap-3 px-1 py-2 mb-6">
        {isMinimal ? (
          <div className="w-10 h-10 rounded-xl bg-zinc-900 border border-zinc-700 shadow-sm flex items-center justify-center shrink-0">
            <div className="w-3.5 h-3.5 rounded-sm bg-white rotate-45" />
          </div>
        ) : (
          <div className="w-10 h-10 rounded-xl bg-[#FACC15] border-2 border-black shadow-[2px_2px_0px_0px_#000] flex items-center justify-center shrink-0">
            <div className="w-4 h-4 rounded-full bg-black" />
          </div>
        )}
        <div>
          <h1 className={`text-lg tracking-tight flex items-center gap-1.5 ${isMinimal ? 'font-bold text-zinc-900' : 'font-black text-black'}`}>
            FINANZAS
          </h1>
          <p className="text-[11px] font-mono text-zinc-500 font-semibold uppercase">
            {isMinimal ? '[Swiss Minimal]' : '[Personal Tracker]'}
          </p>
        </div>
      </div>

      {/* Quick Action Button */}
      {onOpenNewTxModal && (
        <button
          onClick={onOpenNewTxModal}
          className={`w-full mb-6 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl transition-all ${
            isMinimal
              ? 'bg-zinc-900 hover:bg-zinc-800 text-white font-semibold text-sm shadow-sm border border-transparent'
              : 'bg-[#86EFAC] hover:bg-[#4ade80] text-black font-black text-sm border-2 border-black shadow-[3px_3px_0px_0px_#000] active:translate-x-[2px] active:translate-y-[2px]'
          }`}
        >
          <PlusCircle className="w-4 h-4 stroke-[2.5px]" />
          <span>Nuevo Movimiento</span>
        </button>
      )}

      {/* Navigation items */}
      <div className="space-y-1.5 flex-1">
        <p className="px-2 text-[10px] font-bold uppercase tracking-wider text-zinc-400 mb-2 font-mono">
          [NAVEGACIÓN]
        </p>
        {NAV_ITEMS.map(item => {
          const isActive = pathname === item.href;
          const Icon = item.icon;

          if (isMinimal) {
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl transition-all ${
                  isActive
                    ? 'bg-zinc-100 text-zinc-900 font-semibold border border-zinc-200/80 shadow-none'
                    : 'text-zinc-600 hover:text-zinc-950 hover:bg-zinc-50 border border-transparent font-medium'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'stroke-[2.5px] text-zinc-900' : 'stroke-[2px] text-zinc-500'}`} />
                <div>
                  <p className="text-sm tracking-tight leading-none">{item.name}</p>
                  <p className="text-[10px] text-zinc-400 mt-1">{item.desc}</p>
                </div>
              </Link>
            );
          }

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
            className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl transition-all text-left mt-2 ${
              isMinimal
                ? 'text-zinc-600 hover:text-zinc-950 hover:bg-zinc-50 border border-transparent font-medium'
                : 'text-zinc-700 hover:text-black hover:bg-[#FB923C]/20 border-2 border-transparent font-bold'
            }`}
          >
            <CreditCard className="w-4 h-4 stroke-[2px] text-amber-600" />
            <div>
              <p className="text-sm tracking-tight leading-none font-medium">Tarjetas</p>
              <p className="text-[10px] text-zinc-400 mt-1">Cierre y vencimiento</p>
            </div>
          </button>
        )}
      </div>

      {/* Theme Switcher in Sidebar */}
      <div className="pt-3 pb-2">
        <button
          onClick={toggleTheme}
          className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-mono font-bold transition-all ${
            isMinimal
              ? 'bg-zinc-50 hover:bg-zinc-100 text-zinc-700 border border-zinc-200'
              : 'bg-[#FEF08A] hover:bg-[#fde047] text-black border-2 border-black shadow-[2px_2px_0px_0px_#000] active:translate-x-[1px] active:translate-y-[1px]'
          }`}
          title="Alternar estilo entre Bauhaus y Minimal"
        >
          <div className="flex items-center gap-2">
            <Palette className="w-3.5 h-3.5 text-amber-600 stroke-[2.5px]" />
            <span>Tema:</span>
          </div>
          <span className="font-sans font-semibold">
            {isMinimal ? 'Swiss Clean' : 'Bauhaus'}
          </span>
        </button>
      </div>

      {/* Status Footer */}
      <div className={`pt-3 mt-auto ${isMinimal ? 'border-t border-zinc-200' : 'border-t-2 border-black'}`}>
        <div
          className={`flex items-center justify-between text-xs px-2.5 py-2 rounded-xl ${
            isMinimal
              ? 'bg-zinc-50 border border-zinc-200 text-zinc-700 shadow-none'
              : 'bg-[#F4F1EA] border-2 border-black shadow-[2px_2px_0px_0px_#000] text-black'
          }`}
        >
          <div className="flex items-center gap-2">
            <Database className="w-3.5 h-3.5 stroke-[2px]" />
            <span className="font-bold text-[11px]">Supabase</span>
          </div>
          <span
            className={`inline-flex items-center gap-1 text-[10px] font-mono font-bold px-2 py-0.5 rounded-md border ${
              isMinimal
                ? hasSupabase
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                  : 'bg-amber-50 text-amber-700 border-amber-200'
                : hasSupabase
                  ? 'bg-[#86EFAC] text-black border-black'
                  : 'bg-[#FEF08A] text-black border-black'
            }`}
          >
            <span
              className={`w-1.5 h-1.5 rounded-full ${hasSupabase ? 'bg-emerald-500' : 'bg-amber-500'}`}
            />
            {hasSupabase ? 'ONLINE' : 'LOCAL'}
          </span>
        </div>
      </div>
    </aside>
  );
}
