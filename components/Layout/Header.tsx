'use client';

import React, { useState } from 'react';
import { Plus, Send, Info, CreditCard } from 'lucide-react';
import { Modal } from '../UI/Modal';

interface HeaderProps {
  onOpenNewTxModal?: () => void;
  onOpenCreditCardsModal?: () => void;
}

export function BauhausLogo({ className = 'w-8 h-8' }: { className?: string }) {
  return (
    <div className={`relative ${className} bg-[#FACC15] border-2 border-black rounded-xl shadow-[2px_2px_0px_0px_#000] flex items-center justify-center shrink-0`}>
      <div className="w-3.5 h-3.5 rounded-full bg-black" />
    </div>
  );
}

export function Header({ onOpenNewTxModal, onOpenCreditCardsModal }: HeaderProps) {
  const [isTelegramModalOpen, setIsTelegramModalOpen] = useState(false);

  const todayStr = new Intl.DateTimeFormat('es-AR', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  }).format(new Date());

  const capitalizedDate = todayStr.charAt(0).toUpperCase() + todayStr.slice(1);

  return (
    <>
      <header className="sticky top-0 z-30 bg-[#F4F1EA] border-b-2 border-black px-4 md:px-8 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2.5">
            <BauhausLogo className="w-8 h-8" />
            <span className="text-lg md:text-xl font-black tracking-tight text-black">
              FINANZAS
            </span>
          </div>

          <span className="hidden sm:inline-block px-2.5 py-0.5 rounded-md bg-white border-2 border-black text-[11px] font-mono font-bold text-black shadow-[1px_1px_0px_0px_#000]">
            [{capitalizedDate.toUpperCase()}]
          </span>
        </div>

        <div className="flex items-center gap-2.5">
          {/* Credit Cards button */}
          {onOpenCreditCardsModal && (
            <button
              onClick={onOpenCreditCardsModal}
              className="flex items-center gap-1.5 text-xs text-black bg-[#FB923C] border-2 border-black px-2.5 py-1.5 rounded-xl shadow-[2px_2px_0px_0px_#000] font-bold transition-all active:translate-x-[1px] active:translate-y-[1px] active:shadow-[0px_0px_0px_0px_#000]"
              title="Configuración de Tarjetas de Crédito"
            >
              <CreditCard className="w-3.5 h-3.5 stroke-[2.5px]" />
              <span className="hidden sm:inline">Tarjetas</span>
            </button>
          )}

          {/* Telegram info button */}
          <button
            onClick={() => setIsTelegramModalOpen(true)}
            className="flex items-center gap-1.5 text-xs text-black bg-[#60A5FA] border-2 border-black px-2.5 py-1.5 rounded-xl shadow-[2px_2px_0px_0px_#000] font-bold transition-all active:translate-x-[1px] active:translate-y-[1px] active:shadow-[0px_0px_0px_0px_#000]"
            title="Integración Telegram Bot"
          >
            <Send className="w-3.5 h-3.5 stroke-[2.5px]" />
            <span className="hidden sm:inline">Bot Telegram</span>
          </button>

          {/* Quick add movement button */}
          {onOpenNewTxModal && (
            <button
              onClick={onOpenNewTxModal}
              className="flex items-center gap-1.5 bg-[#86EFAC] hover:bg-[#4ade80] text-black font-black text-xs py-1.5 px-3.5 rounded-xl border-2 border-black shadow-[3px_3px_0px_0px_#000] transition-all active:translate-x-[2px] active:translate-y-[2px] active:shadow-[1px_1px_0px_0px_#000]"
            >
              <Plus className="w-4 h-4 stroke-[3px]" />
              <span>Nuevo</span>
            </button>
          )}
        </div>
      </header>

      {/* Telegram Instructions Modal */}
      <Modal
        isOpen={isTelegramModalOpen}
        onClose={() => setIsTelegramModalOpen(false)}
        title="Bot de Telegram Integrado"
        subtitle="Registrá tus gastos al instante enviando un mensaje"
      >
        <div className="space-y-4 text-xs text-zinc-300">
          <p>
            Tu aplicación incluye un endpoint webhook serverless en{' '}
            <code className="bg-black/60 px-1.5 py-0.5 rounded text-emerald-400 font-mono">
              /api/telegram
            </code>
            .
          </p>

          <div className="rounded-xl bg-black/40 border border-white/10 p-3 space-y-2">
            <h4 className="font-semibold text-white text-xs flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
              Ejemplos de comandos admitidos:
            </h4>
            <div className="space-y-1.5 font-mono text-[11px]">
              <div className="bg-white/5 p-2 rounded-lg">
                <span className="text-emerald-400">3500 cafe</span>
                <p className="text-zinc-400 font-sans text-[11px] mt-0.5">
                  👉 Gasto de $ 3.500 ARS en categoría comida/café
                </p>
              </div>
              <div className="bg-white/5 p-2 rounded-lg">
                <span className="text-emerald-400">25 usd hosting</span>
                <p className="text-zinc-400 font-sans text-[11px] mt-0.5">
                  👉 Gasto de U$S 25 USD en tecnología
                </p>
              </div>
              <div className="bg-white/5 p-2 rounded-lg">
                <span className="text-emerald-400">60000 zapatillas 3 cuotas</span>
                <p className="text-zinc-400 font-sans text-[11px] mt-0.5">
                  👉 Crea 3 cuotas mensuales de $ 20.000 ARS cada una
                </p>
              </div>
              <div className="bg-white/5 p-2 rounded-lg">
                <span className="text-emerald-400">debo 50000 mecanico</span>
                <p className="text-zinc-400 font-sans text-[11px] mt-0.5">
                  👉 Registra deuda que vos le debés a alguien
                </p>
              </div>
              <div className="bg-white/5 p-2 rounded-lg">
                <span className="text-emerald-400">me debe 20000 juan</span>
                <p className="text-zinc-400 font-sans text-[11px] mt-0.5">
                  👉 Registra dinero que te debe Juan
                </p>
              </div>
              <div className="bg-white/5 p-2 rounded-lg">
                <span className="text-emerald-400">pago 10000 deuda juan</span>
                <p className="text-zinc-400 font-sans text-[11px] mt-0.5">
                  👉 Registra pago parcial; si llega a 0 marca la deuda como saldada
                </p>
              </div>
              <div className="bg-white/5 p-2 rounded-lg">
                <span className="text-emerald-400">/resumen</span>
                <p className="text-zinc-400 font-sans text-[11px] mt-0.5">
                  👉 Devuelve el total gastado en el mes actual en ARS y USD
                </p>
              </div>
            </div>
          </div>

          <div className="text-[11px] text-zinc-400 bg-white/5 p-3 rounded-xl border border-white/5">
            <span className="text-white font-medium">Configuración:</span> Ingresá tu token en{' '}
            <code className="text-emerald-400">TELEGRAM_BOT_TOKEN</code> y tu ID de chat en{' '}
            <code className="text-emerald-400">TELEGRAM_MY_CHAT_ID</code> en tu archivo{' '}
            <code className="text-zinc-200">.env.local</code>.
          </div>
        </div>
      </Modal>
    </>
  );
}
