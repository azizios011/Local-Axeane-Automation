'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { ExtractedDocument } from '@/lib/api';

interface AppContextType {
  extractedDoc: ExtractedDocument | null;
  setExtractedDoc: (doc: ExtractedDocument | null) => void;
  apiUrl: string;
  setApiUrl: (url: string) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [extractedDoc, setExtractedDoc] = useState<ExtractedDocument | null>(null);
  const [apiUrl, setApiUrl] = useState<string>('http://localhost:8000');

  // Load API URL from localStorage on mount
  useEffect(() => {
    const savedUrl = localStorage.getItem('NEXT_PUBLIC_API_URL');
    if (savedUrl) {
      setApiUrl(savedUrl);
    } else if (process.env.NEXT_PUBLIC_API_URL) {
      setApiUrl(process.env.NEXT_PUBLIC_API_URL);
    }
  }, []);

  // Persist API URL changes
  const updateApiUrl = (url: string) => {
    setApiUrl(url);
    localStorage.setItem('NEXT_PUBLIC_API_URL', url);
  };

  return (
    <AppContext.Provider
      value={{
        extractedDoc,
        setExtractedDoc,
        apiUrl,
        setApiUrl: updateApiUrl,
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
