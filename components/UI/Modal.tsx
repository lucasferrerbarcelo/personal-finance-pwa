'use client';

import React, { useEffect } from 'react';
import { X } from 'lucide-react';

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
        className={`relative z-10 w-full ${maxWidth} rounded-t-2xl sm:rounded-2xl bg-[#F4F1EA] border-2 border-black p-6 shadow-[6px_6px_0px_0px_#000] text-black transition-all animate-in slide-in-from-bottom-6 sm:zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto`}
      >
        <div className="flex items-center justify-between pb-3.5 border-b-2 border-black">
          <div>
            <h2 className="text-lg font-black text-black tracking-tight">{title}</h2>
            {subtitle && <p className="text-xs font-mono font-semibold text-zinc-600 mt-0.5">{subtitle}</p>}
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 bg-white border-2 border-black text-black hover:bg-[#FB923C] shadow-[1.5px_1.5px_0px_0px_#000] transition-colors active:translate-x-[1px] active:translate-y-[1px]"
          >
            <X className="w-4 h-4 stroke-[2.5px]" />
          </button>
        </div>

        <div className="mt-4">{children}</div>
      </div>
    </div>
  );
}
