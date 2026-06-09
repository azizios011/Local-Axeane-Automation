'use client';

import { Toast } from '@/lib/toast';
import { X, CheckCircle2, AlertCircle, Info, AlertTriangle } from 'lucide-react';

interface ToastContainerProps {
  toasts: Toast[];
  onDismiss: (id: string) => void;
}

export default function ToastContainer({ toasts, onDismiss }: ToastContainerProps) {
  const getIcon = (type: Toast['type']) => {
    switch (type) {
      case 'success':
        return <CheckCircle2 className="w-5 h-5 text-primary shrink-0" />;
      case 'error':
        return <AlertCircle className="w-5 h-5 text-error shrink-0" />;
      case 'warning':
        return <AlertTriangle className="w-5 h-5 text-warning shrink-0" />;
      case 'info':
      default:
        return <Info className="w-5 h-5 text-primary shrink-0" />;
    }
  };

  const getBgColor = (type: Toast['type']) => {
    switch (type) {
      case 'success':
        return 'bg-primary/10 border-primary/30';
      case 'error':
        return 'bg-error/10 border-error/30';
      case 'warning':
        return 'bg-warning/10 border-warning/30';
      case 'info':
      default:
        return 'bg-primary/10 border-primary/30';
    }
  };

  const getTextColor = (type: Toast['type']) => {
    switch (type) {
      case 'success':
        return 'text-primary';
      case 'error':
        return 'text-error';
      case 'warning':
        return 'text-warning';
      case 'info':
      default:
        return 'text-primary';
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-3 max-w-sm pointer-events-none">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`flex gap-3 p-4 rounded-lg border ${getBgColor(toast.type)} backdrop-blur-sm pointer-events-auto animate-in fade-in slide-in-from-bottom-4 duration-300`}
          role="status"
          aria-live="polite"
        >
          {getIcon(toast.type)}
          <div className="flex-1 min-w-0">
            <p className={`font-semibold text-sm ${getTextColor(toast.type)}`}>
              {toast.message}
            </p>
            {toast.description && (
              <p className="text-xs text-on-surface-variant mt-1">
                {toast.description}
              </p>
            )}
          </div>
          <button
            onClick={() => onDismiss(toast.id)}
            className="text-on-surface-variant hover:text-on-surface shrink-0 ml-2"
            aria-label="Dismiss notification"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      ))}
    </div>
  );
}
