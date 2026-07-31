'use client';

import { useEffect } from 'react';
import type { Function_ } from '@/types';

export function useFunctionRealtime({
  projectId,
  functionId,
  getSdk,
  onStatusUpdate,
  onReload,
}: {
  projectId: string;
  functionId: string;
  getSdk: () => any;
  onStatusUpdate: (status: string) => void;
  onReload: () => void;
}) {
  useEffect(() => {
    if (!projectId || !functionId) return;
    let cancelled = false;
    const sdk = getSdk();
    const rt = (sdk as any).realtime;
    if (!rt) return;

    const token = localStorage.getItem('fidscript_access_token') ?? localStorage.getItem('fidscript_token') ?? '';

    rt.connect(() => token, projectId).then(() => {
      if (cancelled) return;
      const unsub = rt.subscribeFunctions(projectId, (event: any) => {
        const et = event?.type;
        if (!et || et === 'function.deleted') return;
        const statusMap: Record<string, string> = {
          'function.created': 'ACTIVE', 'function.deployed': 'ACTIVE', 'function.error': 'FAILED',
        };
        const newStatus = statusMap[et];
        if (newStatus) onStatusUpdate(newStatus);
        if (et === 'function.deployed' || et === 'function.error') {
          setTimeout(() => { if (!cancelled) onReload(); }, 800);
        }
      });
      if (cancelled) unsub();
    });

    return () => { cancelled = true; };
  }, [projectId, functionId, getSdk, onStatusUpdate, onReload]);
}
