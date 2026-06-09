import { useCallback, useContext } from 'react';
import { ToastContext } from '@/components/ToastProvider';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

export interface Toast {
  id: string;
  type: ToastType;
  message: string;
  description?: string;
  duration?: number; // milliseconds, 0 = persistent
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within ToastProvider');
  }

  const toast = useCallback(
    (type: ToastType, message: string, description?: string, duration?: number) => {
      context.addToast({
        id: `toast-${Date.now()}-${Math.random()}`,
        type,
        message,
        description,
        duration: duration ?? (type === 'error' ? 6000 : 4000),
      });
    },
    [context],
  );

  return {
    success: (message: string, description?: string) =>
      toast('success', message, description, 4000),
    error: (message: string, description?: string) =>
      toast('error', message, description, 6000),
    info: (message: string, description?: string) =>
      toast('info', message, description, 4000),
    warning: (message: string, description?: string) =>
      toast('warning', message, description, 5000),
    dismiss: context.removeToast,
    dismissAll: context.clearToasts,
  };
}
