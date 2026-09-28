'use client';

import React, { useState, createContext, useContext } from 'react';
import { BottomNav } from './BottomNav';
import { DesktopSidebar } from './DesktopSidebar';
import { Header } from './Header';
import { TransactionModal } from '../Movimientos/TransactionModal';
import { Transaction } from '@/lib/supabase/types';

interface AppContextType {
  openNewTxModal: () => void;
  openEditTxModal: (tx: Transaction) => void;
  refreshTrigger: number;
  triggerRefresh: () => void;
}

const AppContext = createContext<AppContextType>({
  openNewTxModal: () => {},
  openEditTxModal: () => {},
  refreshTrigger: 0,
  triggerRefresh: () => {},
});

export const useApp = () => useContext(AppContext);

export function AppShell({ children }: { children: React.ReactNode }) {
  const [isTxModalOpen, setIsTxModalOpen] = useState(false);
  const [editingTx, setEditingTx] = useState<Transaction | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const triggerRefresh = () => setRefreshTrigger(prev => prev + 1);

  const openNewTxModal = () => {
    setEditingTx(null);
    setIsTxModalOpen(true);
  };

  const openEditTxModal = (tx: Transaction) => {
    setEditingTx(tx);
    setIsTxModalOpen(true);
  };

  return (
    <AppContext.Provider
      value={{
        openNewTxModal,
        openEditTxModal,
        refreshTrigger,
        triggerRefresh,
      }}
    >
      <div className="min-h-screen bg-[#09090b] text-zinc-100 flex flex-col md:flex-row antialiased selection:bg-emerald-500/30">
        {/* Desktop Sidebar */}
        <DesktopSidebar onOpenNewTxModal={openNewTxModal} />

        {/* Main Content Area */}
        <div className="flex-1 md:pl-64 flex flex-col min-w-0">
          <Header onOpenNewTxModal={openNewTxModal} />

          <main className="flex-1 p-4 md:p-8 max-w-6xl w-full mx-auto pb-24 md:pb-12">
            {children}
          </main>

          {/* Mobile Bottom Navigation */}
          <BottomNav />
        </div>

        {/* Global Transaction Modal */}
        <TransactionModal
          isOpen={isTxModalOpen}
          onClose={() => {
            setIsTxModalOpen(false);
            setEditingTx(null);
          }}
          onSuccess={() => {
            triggerRefresh();
          }}
          transactionToEdit={editingTx}
        />
      </div>
    </AppContext.Provider>
  );
}
