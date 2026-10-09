'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, ArrowLeftRight, HandCoins, CalendarClock } from 'lucide-react';
import { useTheme } from '@/lib/theme/ThemeContext';

const NAV_ITEMS = [
  {
    name: 'Dashboard',
    href: '/',
    icon: LayoutDashboard,
  },
  {
    name: 'Movimientos',
    href: '/movimientos',
    icon: ArrowLeftRight,
  },
  {
    name: 'Deudas',
    href: '/deudas',
    icon: HandCoins,
  },
  {
    name: 'Cuotas',
    href: '/cuotas',
    icon: CalendarClock,
  },
];

export function BottomNav() {
  const pathname = usePathname();
  const { isMinimal } = useTheme();

  return (
    <nav
      className={`md:hidden fixed bottom-0 left-0 right-0 z-40 transition-colors duration-150 ${
        isMinimal
          ? 'border-t border-zinc-200 bg-white/95 backdrop-blur-md shadow-sm'
          : 'border-t-2 border-black bg-[#F4F1EA] shadow-[0px_-2px_0px_0px_#000]'
      }`}
    >
      <div className="flex items-center justify-around h-16 max-w-md mx-auto px-3">
        {NAV_ITEMS.map(item => {
          const isActive = pathname === item.href;
          const Icon = item.icon;

          if (isMinimal) {
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex flex-col items-center justify-center py-1.5 px-3 rounded-xl transition-all ${
                  isActive
                    ? 'bg-zinc-900 text-white shadow-sm font-semibold'
                    : 'text-zinc-500 hover:text-zinc-900 font-medium'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'stroke-[2.5px]' : 'stroke-[2px]'}`} />
                <span className="text-[10px] mt-0.5 tracking-tight">{item.name}</span>
              </Link>
            );
          }

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center justify-center py-1 px-2.5 rounded-xl transition-all ${
                isActive
                  ? 'bg-[#FACC15] text-black border-2 border-black shadow-[2px_2px_0px_0px_#000] font-black scale-105'
                  : 'text-zinc-600 hover:text-black font-bold'
              }`}
            >
              <Icon className={`w-5 h-5 ${isActive ? 'stroke-[2.5px]' : 'stroke-[2px]'}`} />
              <span className="text-[10px] mt-0.5 tracking-tight font-sans">{item.name}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
