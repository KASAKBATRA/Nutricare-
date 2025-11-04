import React, { createContext, useContext, useState, ReactNode } from 'react';

type ScanStatus = 'Healthy' | 'Moderate' | 'Unhealthy' | null;

interface ScanContextType {
  open: () => void;
  close: () => void;
  isOpen: boolean;
  lastStatus: ScanStatus;
  setLastStatus: (s: ScanStatus) => void;
  unread: boolean;
  clearUnread: () => void;
}

const ScanContext = createContext<ScanContextType | undefined>(undefined);

export function ScanProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [lastStatus, setLastStatus] = useState<ScanStatus>(null);
  const [unread, setUnread] = useState(false);

  const open = () => {
    setIsOpen(true);
    setUnread(false); // viewing clears unread
  };

  const close = () => setIsOpen(false);

  const setLastStatusAndUnread = (s: ScanStatus) => {
    setLastStatus(s);
    if (s) setUnread(true);
  };

  const clearUnread = () => setUnread(false);

  return (
    <ScanContext.Provider value={{ open, close, isOpen, lastStatus, setLastStatus: setLastStatusAndUnread, unread, clearUnread }}>
      {children}
    </ScanContext.Provider>
  );
}

export function useScan() {
  const ctx = useContext(ScanContext);
  if (!ctx) throw new Error('useScan must be used within ScanProvider');
  return ctx;
}

export type { ScanStatus };
