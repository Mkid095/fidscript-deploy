import React, { useEffect, useState } from 'react';

type ToastType = 'success' | 'error' | 'warning' | 'info';

interface ToastProps {
  type: ToastType;
  message: string;
  duration?: number;
  onClose: () => void;
}

const typeClasses: Record<ToastType, string> = {
  success: 'bg-[var(--success)]/10 border-[var(--success)]/30 text-[var(--success)]',
  error: 'bg-[var(--danger)]/10 border-[var(--danger)]/30 text-[var(--danger)]',
  warning: 'bg-[var(--warning)]/10 border-[var(--warning)]/30 text-[var(--warning)]',
  info: 'bg-[var(--info)]/10 border-[var(--info)]/30 text-[var(--info)]',
};

export function Toast({ type, message, duration = 5000, onClose }: ToastProps) {
  useEffect(() => {
    const timer = setTimeout(onClose, duration);
    return () => clearTimeout(timer);
  }, [duration, onClose]);

  return (
    <div
      className={`
        fixed bottom-4 right-4 z-50
        px-4 py-3 rounded-lg border shadow-lg
        max-w-sm
        ${typeClasses[type]}
      `}
    >
      <div className="flex items-start gap-3">
        <p className="text-sm font-medium">{message}</p>
        <button onClick={onClose} className="text-current opacity-60 hover:opacity-100">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  );
}

// Toast hook for managing multiple toasts
export function useToast() {
  const [toasts, setToasts] = useState<Array<{ id: string; type: ToastType; message: string }>>([]);

  const addToast = (type: ToastType, message: string) => {
    const id = Math.random().toString(36).substring(7);
    setToasts((prev) => [...prev, { id, type, message }]);
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  return { toasts, addToast, removeToast };
}
