'use client';

import { createContext, useCallback, useContext, useState } from 'react';
import { ConfirmDialog } from '@/components/deployments/confirm-dialog';

export type ConfirmVariant = 'danger' | 'warning';

export interface ConfirmOptions {
  title: string;
  message: string;
  confirmLabel?: string;
  variant?: ConfirmVariant;
}

interface ConfirmRequest extends ConfirmOptions {
  resolve: (ok: boolean) => void;
}

interface ConfirmContextValue {
  confirm: (opts: ConfirmOptions | string) => Promise<boolean>;
}

const ConfirmContext = createContext<ConfirmContextValue>({ confirm: async () => false });

export function useConfirm(): (opts: ConfirmOptions | string) => Promise<boolean> {
  return useContext(ConfirmContext).confirm;
}

export function ConfirmProvider({ children }: { children: React.ReactNode }) {
  const [request, setRequest] = useState<ConfirmRequest | null>(null);

  const confirm = useCallback((opts: ConfirmOptions | string) => {
    const normalized: ConfirmOptions =
      typeof opts === 'string' ? { title: 'Confirm', message: opts } : opts;
    return new Promise<boolean>(resolve => {
      setRequest({ ...normalized, resolve });
    });
  }, []);

  const handleClose = useCallback(() => {
    request?.resolve(false);
    setRequest(null);
  }, [request]);

  const handleConfirm = useCallback(() => {
    request?.resolve(true);
    setRequest(null);
  }, [request]);

  return (
    <ConfirmContext.Provider value={{ confirm }}>
      {children}
      {request && (
        <ConfirmDialog
          title={request.title}
          message={request.message}
          confirmLabel={request.confirmLabel ?? 'Confirm'}
          variant={request.variant ?? 'warning'}
          onConfirm={handleConfirm}
          onClose={handleClose}
        />
      )}
    </ConfirmContext.Provider>
  );
}