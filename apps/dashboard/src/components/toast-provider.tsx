'use client';

import { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react';
import { HugeiconsIcon } from '@hugeicons/react';
import { CheckmarkCircle02Icon, AlertCircleIcon, CheckmarkCircle01Icon, CancelCircleIcon } from '@hugeicons/core-free-icons';

type ToastType = 'success' | 'error' | 'warning' | 'info';

interface Toast {
  id: string;
  type: ToastType;
  message: string;
}

interface ToastContextValue {
  showToast: (toast: Omit<Toast, 'id'>) => void;
}

const ToastContext = createContext<ToastContextValue>({ showToast: () => {} });

export function useToast() {
  return useContext(ToastContext);
}

const ICONS: Record<ToastType, typeof CheckmarkCircle02Icon> = {
  success: CheckmarkCircle02Icon,
  error:   AlertCircleIcon,
  warning: AlertCircleIcon,
  info:    CheckmarkCircle01Icon,
};

const COLORS: Record<ToastType, string> = {
  success: 'border-emerald-800 bg-emerald-950/80 text-emerald-300',
  error:   'border-red-800 bg-red-950/80 text-red-300',
  warning: 'border-amber-800 bg-amber-950/80 text-amber-300',
  info:    'border-blue-800 bg-blue-950/80 text-blue-300',
};

const ICON_COLORS: Record<ToastType, string> = {
  success: 'text-emerald-400',
  error:   'text-red-400',
  warning: 'text-amber-400',
  info:    'text-blue-400',
};

function ToastItem({ toast, onRemove }: { toast: Toast; onRemove: (id: string) => void }) {
  const [visible, setVisible] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    // Mount animation
    const show = requestAnimationFrame(() => setVisible(true));
    // Auto-dismiss after 4s
    timerRef.current = setTimeout(() => {
      setLeaving(true);
      setTimeout(() => onRemove(toast.id), 300);
    }, 4000);
    return () => {
      cancelAnimationFrame(show);
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [toast.id, onRemove]);

  const handleDismiss = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setLeaving(true);
    setTimeout(() => onRemove(toast.id), 300);
  };

  const Icon = ICONS[toast.type];

  return (
    <div
      className={`
        flex items-start gap-3 px-4 py-3 rounded-lg border shadow-2xl
        transition-all duration-300
        ${COLORS[toast.type]}
        ${visible && !leaving ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-4'}
      `}
      role="alert"
      aria-live="polite"
    >
      <HugeiconsIcon icon={Icon} size={16} className={`flex-shrink-0 mt-0.5 ${ICON_COLORS[toast.type]}`} />
      <p className="text-sm flex-1 leading-snug">{toast.message}</p>
      <button
        onClick={handleDismiss}
        className="text-slate-600 hover:text-slate-400 transition-colors flex-shrink-0 p-0.5 -mr-1 -mt-0.5"
        aria-label="Dismiss"
      >
        <HugeiconsIcon icon={CancelCircleIcon} size={14} />
      </button>
    </div>
  );
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const counterRef = useRef(0);

  const showToast = useCallback((toast: Omit<Toast, 'id'>) => {
    const id = String(++counterRef.current);
    setToasts(prev => [...prev, { ...toast, id }]);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      {/* Toast portal — fixed bottom-right */}
      <div
        className="fixed bottom-5 right-5 z-50 flex flex-col gap-2 w-80"
        aria-label="Notifications"
      >
        {toasts.map(t => (
          <ToastItem key={t.id} toast={t} onRemove={removeToast} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}
