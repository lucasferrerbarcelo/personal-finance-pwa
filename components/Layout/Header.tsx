'use client';

import React, { useState } from 'react';
import { Plus, Send, Info } from 'lucide-react';
import { Modal } from '../UI/Modal';

interface HeaderProps {
  onOpenNewTxModal?: () => void;
}

export function Header({ onOpenNewTxModal }: HeaderProps) {
  const [isTelegramModalOpen, setIsTelegramModalOpen] = useState(false);

  const todayStr = new Intl.DateTimeFormat('es-AR', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  }).format(new Date());

  const capitalizedDate = todayStr.charAt(0).toUpperCase() + todayStr.slice(1);

  return (
    <>
      <header className="sticky top-0 z-30 glass border-b border-white/10 px-4 md:px-8 py-3.5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="md:hidden w-8 h-8 rounded-lg bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center text-black font-black text-sm">
            $
          </div>
          <div>
            <h1 className="text-sm md:text-base font-bold text-white tracking-tight flex items-center gap-1.5">
              <span>Mi Economía</span>
              <span className="text-[10px] text-zinc-400 font-normal px-2 py-0.5 rounded-full bg-white/5 border border-white/5">
                {capitalizedDate}
              </span>
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Telegram info button */}
          <button
            onClick={() => setIsTelegramModalOpen(true)}
            className="flex items-center gap-1.5 text-xs text-sky-400 hover:text-sky-300 bg-sky-500/10 hover:bg-sky-500/20 border border-sky-500/20 px-2.5 py-1.5 rounded-xl transition-all"
            title="Integración Telegram Bot"
          >
            <Send className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Bot Telegram</span>
          </button>

          {/* Quick add movement button */}
          {onOpenNewTxModal && (
            <button
              onClick={onOpenNewTxModal}
              className="flex items-center gap-1.5 bg-emerald-500 hover:bg-emerald-400 text-black font-semibold text-xs py-1.5 px-3 rounded-xl transition-transform active:scale-95 shadow-md shadow-emerald-500/20"
            >
              <Plus className="w-4 h-4 stroke-[2.5px]" />
              <span className="inline">Movimiento</span>
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
