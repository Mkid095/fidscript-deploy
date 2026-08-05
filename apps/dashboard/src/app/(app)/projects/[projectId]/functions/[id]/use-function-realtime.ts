'use client';

import { useEffect, useRef } from 'react';

export function useFunctionRealtime({
  projectId,
  functionId,
  getSdk,
  onStatusUpdate,
  onReload,
}: {
  projectId: string;
  functionId: string;
  getSdk: () => unknown;
  onStatusUpdate: (status: string) => void;
  onReload: () => void;
}) {
  const unsubRef = useRef<(() => void) | undefined>(undefined);

  useEffect(() => {
    if (!projectId || !functionId) return;
    let cancelled = false;

    // Unsubscribe any prior subscription before starting a new one
    unsubRef.current?.();

    const sdk = getSdk();
    const rt = (sdk as Record<string, unknown>).realtime;
    if (!rt) return;

    const token = (localStorage.getItem('fidscript_access_token')
      ?? localStorage.getItem('fidscript_token')
      ?? '') as string;

    (rt as { connect: (t: () => string, p: string) => Promise<void> })
      .connect(() => token, projectId)
      .then(() => {
        if (cancelled) return;
        unsubRef.current = (rt as {
          subscribeFunctions: (p: string, cb: (e: unknown) => void) => () => void
        }).subscribeFunctions(projectId, (event: unknown) => {
          if (cancelled) return;
          const et = (event as { type?: string })?.type;
          if (!et || et === 'function.deleted') return;
          const statusMap: Record<string, string> = {
            'function.created': 'ACTIVE',
            'function.deployed': 'ACTIVE',
            'function.error': 'FAILED',
          };
          const newStatus = statusMap[et];
          if (newStatus) onStatusUpdate(newStatus);
          if (et === 'function.deployed' || et === 'function.error') {
            setTimeout(() => { if (!cancelled) onReload(); }, 800);
          }
        });
      });

    return () => {
      cancelled = true;
      unsubRef.current?.();
    };
  }, [projectId, functionId, getSdk, onStatusUpdate, onReload]);
}
