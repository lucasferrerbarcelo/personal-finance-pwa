'use client';

import React, { useState, useEffect } from 'react';
import { Modal } from '../UI/Modal';
import { CreditCard } from '@/lib/supabase/types';
import { fetchCreditCards, saveCreditCard, deleteCreditCard } from '@/lib/creditCards/service';
import { CreditCard as CardIcon, Plus, Trash2, Check, AlertCircle } from 'lucide-react';

interface CreditCardsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCardsUpdated?: () => void;
}

export function CreditCardsModal({ isOpen, onClose, onCardsUpdated }: CreditCardsModalProps) {
  const [cards, setCards] = useState<CreditCard[]>([]);
  const [loading, setLoading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  // Form state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState('Visa Galicia');
  const [closingDay, setClosingDay] = useState<number>(24);
  const [dueDay, setDueDay] = useState<number>(5);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const loadCards = async () => {
    setLoading(true);
    try {
      const data = await fetchCreditCards();
      setCards(data);
    } catch (e) {
      console.error('Error loading cards:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadCards();
      setIsEditing(false);
      setErrorMsg(null);
    }
  }, [isOpen]);

  const handleStartAdd = () => {
    setEditingId(null);
    setName('');
    setClosingDay(24);
    setDueDay(5);
    setIsEditing(true);
    setErrorMsg(null);
  };

  const handleStartEdit = (card: CreditCard) => {
    setEditingId(card.id);
    setName(card.name);
    setClosingDay(card.closing_day);
    setDueDay(card.due_day);
    setIsEditing(true);
    setErrorMsg(null);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const trimmedName = name.trim();
    if (!trimmedName) {
      setErrorMsg('Ingresá el nombre de la tarjeta');
      return;
    }

    if (closingDay < 1 || closingDay > 31) {
      setErrorMsg('El día de cierre debe estar entre 1 y 31');
      return;
    }

    if (dueDay < 1 || dueDay > 31) {
      setErrorMsg('El día de vencimiento debe estar entre 1 y 31');
      return;
    }

    setLoading(true);
    try {
      await saveCreditCard({
        id: editingId || undefined,
        name: trimmedName,
        closing_day: Number(closingDay),
        due_day: Number(dueDay),
        is_default: true,
      });

      setIsEditing(false);
      await loadCards();
      onCardsUpdated?.();
    } catch (err: any) {
      setErrorMsg(err.message || 'Error al guardar tarjeta');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm('¿Eliminar esta tarjeta?')) {
      setLoading(true);
      try {
        await deleteCreditCard(id);
        await loadCards();
        onCardsUpdated?.();
      } catch (err) {
        console.error('Error deleting card:', err);
      } finally {
        setLoading(false);
      }
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Configuración de Tarjetas de Crédito"
      subtitle="Definí día de cierre y vencimiento para la imputación de gastos"
    >
      <div className="space-y-5 text-black">
        {errorMsg && (
          <div className="bg-[#F87171] border-2 border-black rounded-xl p-3 shadow-[2px_2px_0px_0px_#000] flex items-center gap-2 text-xs font-bold text-black">
            <AlertCircle className="w-4 h-4 shrink-0 stroke-[2.5px]" />
            <span>{errorMsg}</span>
          </div>
        )}

        {isEditing ? (
          <form onSubmit={handleSave} className="bg-white border-2 border-black rounded-2xl p-4 shadow-[3px_3px_0px_0px_#000] space-y-4">
            <h4 className="font-mono text-xs font-black uppercase tracking-wider text-zinc-600">
              {editingId ? '[EDITAR TARJETA]' : '[NUEVA TARJETA]'}
            </h4>

            <div>
              <label className="block text-xs font-bold font-mono uppercase mb-1">
                Nombre de la Tarjeta
              </label>
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="Ej: Visa Galicia, Mastercard BBVA"
                className="w-full bg-[#F4F1EA] border-2 border-black rounded-xl px-3 py-2 text-sm font-semibold text-black placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-[#FACC15]"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold font-mono uppercase mb-1">
                  Día de Cierre
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min="1"
                    max="31"
                    value={closingDay}
                    onChange={e => setClosingDay(parseInt(e.target.value, 10) || 1)}
                    className="w-full bg-[#F4F1EA] border-2 border-black rounded-xl px-3 py-2 text-sm font-mono font-bold text-black focus:outline-none focus:ring-2 focus:ring-[#FACC15]"
                    required
                  />
                  <span className="absolute right-3 top-2.5 text-xs font-mono font-bold text-zinc-500">
                    día
                  </span>
                </div>
                <p className="text-[10px] text-zinc-500 mt-1">Por defecto: 24</p>
              </div>

              <div>
                <label className="block text-xs font-bold font-mono uppercase mb-1">
                  Día de Vencimiento
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min="1"
                    max="31"
                    value={dueDay}
                    onChange={e => setDueDay(parseInt(e.target.value, 10) || 1)}
                    className="w-full bg-[#F4F1EA] border-2 border-black rounded-xl px-3 py-2 text-sm font-mono font-bold text-black focus:outline-none focus:ring-2 focus:ring-[#FACC15]"
                    required
                  />
                  <span className="absolute right-3 top-2.5 text-xs font-mono font-bold text-zinc-500">
                    día
                  </span>
                </div>
                <p className="text-[10px] text-zinc-500 mt-1">Por defecto: 5</p>
              </div>
            </div>

            <div className="bg-[#FEF08A] border-2 border-black rounded-xl p-3 text-[11px] font-medium leading-relaxed shadow-[2px_2px_0px_0px_#000]">
              <span className="font-bold">ℹ️ Regla de imputación:</span> Las compras realizadas hasta el día <strong>{closingDay}</strong> se pagan el día <strong>{dueDay}</strong> del mes siguiente. Pasado el día {closingDay}, pasan al resumen del mes subsiguiente.
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsEditing(false)}
                className="bg-white hover:bg-zinc-100 text-black font-bold font-mono text-xs py-2 px-3.5 rounded-xl border-2 border-black shadow-[2px_2px_0px_0px_#000] active:translate-x-[1px] active:translate-y-[1px] transition-all"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={loading}
                className="bg-[#86EFAC] hover:bg-[#4ade80] text-black font-black font-mono text-xs py-2 px-4 rounded-xl border-2 border-black shadow-[3px_3px_0px_0px_#000] active:translate-x-[2px] active:translate-y-[2px] active:shadow-[1px_1px_0px_0px_#000] transition-all flex items-center gap-1.5"
              >
                <Check className="w-3.5 h-3.5 stroke-[3px]" />
                <span>Guardar Tarjeta</span>
              </button>
            </div>
          </form>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="font-mono text-xs font-black uppercase text-zinc-600">
                [TARJETAS ACTIVAS ({cards.length})]
              </span>
              <button
                onClick={handleStartAdd}
                className="flex items-center gap-1.5 bg-[#FACC15] hover:bg-[#eab308] text-black font-black font-mono text-xs py-1.5 px-3 rounded-xl border-2 border-black shadow-[2px_2px_0px_0px_#000] active:translate-x-[1px] active:translate-y-[1px] transition-all"
              >
                <Plus className="w-3.5 h-3.5 stroke-[3px]" />
                <span>Agregar Tarjeta</span>
              </button>
            </div>

            {cards.length === 0 ? (
              <div className="bg-white border-2 border-black rounded-2xl p-6 text-center shadow-[3px_3px_0px_0px_#000]">
                <CardIcon className="w-8 h-8 mx-auto text-zinc-400 mb-2 stroke-[1.5px]" />
                <p className="text-xs font-bold text-zinc-600">No hay tarjetas configuradas</p>
                <p className="text-[11px] text-zinc-400 mt-0.5">Se asume por defecto Cierre: día 24, Vencimiento: día 5</p>
              </div>
            ) : (
              <div className="space-y-3">
                {cards.map(card => (
                  <div
                    key={card.id}
                    className="bg-white border-2 border-black rounded-2xl p-4 shadow-[3px_3px_0px_0px_#000] flex items-center justify-between gap-3"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-[#FACC15] border-2 border-black shadow-[2px_2px_0px_0px_#000] flex items-center justify-center shrink-0">
                        <CardIcon className="w-5 h-5 text-black stroke-[2.5px]" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-black text-sm text-black tracking-tight">{card.name}</h4>
                          {card.is_default && (
                            <span className="px-1.5 py-0.2 bg-black text-[#FACC15] font-mono text-[9px] font-black uppercase rounded border border-black">
                              PRINCIPAL
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 mt-1 text-xs font-mono font-bold text-zinc-700">
                          <span className="bg-[#FEF08A] px-2 py-0.5 rounded-md border border-black text-[10px]">
                            ⏳ Cierre: día {card.closing_day}
                          </span>
                          <span className="bg-[#86EFAC] px-2 py-0.5 rounded-md border border-black text-[10px]">
                            ⚠️ Vence: día {card.due_day}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => handleStartEdit(card)}
                        className="bg-white hover:bg-zinc-100 text-black font-bold font-mono text-xs py-1.5 px-2.5 rounded-lg border-2 border-black shadow-[1.5px_1.5px_0px_0px_#000] active:translate-x-[1px] active:translate-y-[1px] transition-all"
                      >
                        Editar
                      </button>
                      {cards.length > 1 && (
                        <button
                          onClick={() => handleDelete(card.id)}
                          className="bg-[#F87171] hover:bg-red-400 text-black p-1.5 rounded-lg border-2 border-black shadow-[1.5px_1.5px_0px_0px_#000] active:translate-x-[1px] active:translate-y-[1px] transition-all"
                          title="Eliminar tarjeta"
                        >
                          <Trash2 className="w-3.5 h-3.5 stroke-[2.5px]" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </Modal>
  );
}
