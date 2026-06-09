'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { ExtractedDocument } from '@/lib/api';

interface AppContextType {
  extractedDoc: ExtractedDocument | null;
  setExtractedDoc: (doc: ExtractedDocument | null) => void;
  apiUrl: string;
  setApiUrl: (url: string) => void;
  cdpPort: number;
  setCdpPort: (port: number) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [extractedDoc, setExtractedDoc] = useState<ExtractedDocument | null>(null);
  const [apiUrl, setApiUrl] = useState<string>('http://localhost:8000');
  const [cdpPort, setCdpPort] = useState<number>(9222);

  // Load from localStorage on mount
  useEffect(() => {
    const savedUrl = localStorage.getItem('NEXT_PUBLIC_API_URL');
    if (savedUrl) setApiUrl(savedUrl);
    else if (process.env.NEXT_PUBLIC_API_URL) setApiUrl(process.env.NEXT_PUBLIC_API_URL);

    const savedPort = localStorage.getItem('CDP_PORT');
    if (savedPort) setCdpPort(parseInt(savedPort, 10));
  }, []);

  // Persist changes
  const updateApiUrl = (url: string) => {
    setApiUrl(url);
    localStorage.setItem('NEXT_PUBLIC_API_URL', url);
  };

  const updateCdpPort = (port: number) => {
    setCdpPort(port);
    localStorage.setItem('CDP_PORT', port.toString());
  };

  return (
    <AppContext.Provider
      value={{
        extractedDoc,
        setExtractedDoc,
        apiUrl,
        setApiUrl: updateApiUrl,
        cdpPort,
        setCdpPort: updateCdpPort,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useAppContext() {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useAppContext must be used within an AppProvider');
  }
  return context;
}
