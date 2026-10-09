'use client';

import React, { useEffect } from 'react';
import { X } from 'lucide-react';
import { useTheme } from '@/lib/theme/ThemeContext';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  maxWidth?: string;
}

export function Modal({
  isOpen,
  onClose,
  title,
  subtitle,
  children,
  maxWidth = 'max-w-md',
}: ModalProps) {
  const { isMinimal } = useTheme();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.body.style.overflow = 'unset';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/70 backdrop-blur-sm transition-opacity animate-in fade-in duration-200"
        onClick={onClose}
      />

      {/* Modal Dialog / Mobile Bottom Sheet */}
      <div
        className={`relative z-10 w-full ${maxWidth} rounded-t-2xl sm:rounded-2xl p-6 transition-all animate-in slide-in-from-bottom-6 sm:zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto ${
          isMinimal
            ? 'bg-white border border-zinc-200 shadow-xl text-zinc-900'
            : 'bg-[#F4F1EA] border-2 border-black shadow-[6px_6px_0px_0px_#000] text-black'
        }`}
      >
        <div
          className={`flex items-center justify-between pb-3.5 ${
            isMinimal ? 'border-b border-zinc-100' : 'border-b-2 border-black'
          }`}
        >
          <div>
            <h2
              className={`text-lg tracking-tight ${
                isMinimal ? 'font-bold text-zinc-900' : 'font-black text-black'
              }`}
            >
              {title}
            </h2>
            {subtitle && (
              <p
                className={`text-xs mt-0.5 ${
                  isMinimal ? 'text-zinc-500 font-sans' : 'font-mono font-semibold text-zinc-600'
                }`}
              >
                {subtitle}
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            className={`p-1.5 transition-colors ${
              isMinimal
                ? 'rounded-lg bg-zinc-100 hover:bg-zinc-200 text-zinc-700 border border-zinc-200'
                : 'rounded-lg bg-white border-2 border-black text-black hover:bg-[#FB923C] shadow-[1.5px_1.5px_0px_0px_#000] active:translate-x-[1px] active:translate-y-[1px]'
            }`}
          >
            <X className="w-4 h-4 stroke-[2px]" />
          </button>
        </div>

        <div className="mt-4">{children}</div>
      </div>
    </div>
  );
}
