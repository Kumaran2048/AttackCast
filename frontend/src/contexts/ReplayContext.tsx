import React, { createContext, useContext } from 'react';
import { useReplay, type ReplayApi } from '../hooks/useReplay';

const ReplayContext = createContext<ReplayApi | null>(null);

export function ReplayProvider({ children }: {children: React.ReactNode;}) {
  const api = useReplay();
  return <ReplayContext.Provider value={api}>{children}</ReplayContext.Provider>;
}

export function useReplayContext(): ReplayApi {
  const ctx = useContext(ReplayContext);
  if (!ctx) throw new Error('useReplayContext must be used inside ReplayProvider');
  return ctx;
}