'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { createPortal } from 'react-dom';

/**
 * A toast.
 *
 * One way for every action to say what happened: a small panel in the
 * corner of the screen, in the tone of the news — success, error, or
 * neutral — that arrives, stays long enough to read, and goes by itself.
 * An action's result should not be a paragraph buried in the card the
 * action happened in.
 */

export type ToastTone = 'success' | 'error' | 'info';

export interface Toast {
  id: number;
  title: string;
  body?: string;
  tone: ToastTone;
}

interface ToastContextValue {
  push: (toast: { title: string; body?: string; tone?: ToastTone }) => void;
}

const ToastContext = createContext<ToastContextValue>({ push: () => {} });

/** Say what an action did. Reads at the call site: `toast('The records were written.')`. */
export function useToast() {
  const { push } = useContext(ToastContext);
  return useMemo(
    () => ({
      success: (title: string, body?: string) =>
        push({ title, body, tone: 'success' }),
      error: (title: string, body?: string) =>
        push({ title, body, tone: 'error' }),
      info: (title: string, body?: string) =>
        push({ title, body, tone: 'info' }),
    }),
    [push],
  );
}

const TONES: Record<ToastTone, { bar: string; mark: string; icon: string }> = {
  success: {
    bar: 'border-l-success',
    mark: 'text-success',
    icon: 'M3 8.5l3 3 5-6',
  },
  error: {
    bar: 'border-l-danger',
    mark: 'text-danger',
    icon: 'M3 3l8 8M11 3l-8 8',
  },
  info: {
    bar: 'border-l-info',
    mark: 'text-info',
    icon: 'M7 3v.5M7 6v6',
  },
};

const LIFETIME = 4500;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [mounted, setMounted] = useState(false);
  const nextId = useRef(1);

  useEffect(() => {
    setMounted(true);
  }, []);

  const push = useCallback(
    (toast: { title: string; body?: string; tone?: ToastTone }) => {
      const id = nextId.current++;
      const tone = toast.tone ?? 'info';
      setToasts((current) => [
        ...current.slice(-3),
        { id, tone, title: toast.title, body: toast.body },
      ]);
      setTimeout(() => {
        setToasts((current) => current.filter((entry) => entry.id !== id));
      }, LIFETIME);
    },
    [],
  );

  const value = useMemo(() => ({ push }), [push]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      {mounted && toasts.length > 0
        ? createPortal(
            <div
              aria-live="polite"
              className="fixed bottom-4 right-4 z-[70] flex w-full max-w-sm flex-col gap-2"
            >
              {toasts.map((toast) => {
                const tone = TONES[toast.tone];
                return (
                  <div
                    key={toast.id}
                    className={`toast-enter flex items-start gap-3 rounded-lg border border-rail border-l-4 bg-surface p-3 shadow-lg ${tone.bar}`}
                  >
                    <svg
                      aria-hidden
                      width="16"
                      height="16"
                      viewBox="0 0 14 14"
                      fill="none"
                      className={`mt-0.5 shrink-0 ${tone.mark}`}
                    >
                      <path
                        d={tone.icon}
                        stroke="currentColor"
                        strokeWidth="1.6"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-text">
                        {toast.title}
                      </p>
                      {toast.body ? (
                        <p className="mt-0.5 text-xs leading-relaxed text-text-muted">
                          {toast.body}
                        </p>
                      ) : null}
                    </div>
                  </div>
                );
              })}
            </div>,
            document.body,
          )
        : null}
    </ToastContext.Provider>
  );
}
