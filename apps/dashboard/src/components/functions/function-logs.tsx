'use client';

import { useCallback, useEffect, useState } from 'react';
import { Spinner } from '@fidscript/ui';

import { LogViewer } from '@/components/deployments/log-viewer';
import type { FidscriptSDK } from '@fidscript/sdk';

interface FunctionLogsProps {
  projectId: string;
  functionId: string;
  getSdk: () => FidscriptSDK;
  inFlight?: boolean;
}

interface FunctionLog {
  id: string;
  timestamp: string;
  level: string;
  message: string;
}

export function FunctionLogs({ projectId, functionId, getSdk, inFlight }: FunctionLogsProps) {
  const [logs, setLogs] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadLogs = useCallback(async () => {
    try {
      // Real SDK returns { logs: FunctionLog[] }, unwrap
      const raw = await getSdk().functions.getLogs(projectId, functionId, 100) as { logs: FunctionLog[] } | FunctionLog[];
      const data: FunctionLog[] = Array.isArray(raw) ? raw : raw.logs;
      const formatted = data
        .map(l => `[${new Date(l.timestamp).toLocaleTimeString()}] [${l.level.toUpperCase()}] ${l.message}`)
        .join('\n');
      setLogs(formatted || '// No logs yet');
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load logs');
    } finally {
      setLoading(false);
    }
  }, [projectId, functionId, getSdk]);

  useEffect(() => { loadLogs(); }, [loadLogs]);

  // Realtime: subscribe to function events and refresh logs on deploy/invoke/error
  useEffect(() => {
    if (!projectId || !functionId) return;
    const sdk = getSdk();
    const rt = (sdk as any).realtime;
    if (!rt) return;

    let cancelled = false;
    let unsub: (() => void) | undefined;
    const token = localStorage.getItem('fidscript_access_token')
      ?? localStorage.getItem('fidscript_token') ?? '';

    rt.connect(() => token, projectId).then(() => {
      if (cancelled) return;
      unsub = rt.subscribeFunctions(projectId, (event: any) => {
        if (cancelled) return;
        const et = event?.type;
        if (et === 'function.deployed' || et === 'function.invoked' || et === 'function.error') {
          loadLogs();
        }
      });
    });

    return () => {
      cancelled = true;
      unsub?.();
    };
  }, [projectId, functionId, getSdk, loadLogs]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Spinner size="lg" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-[var(--danger)] text-sm mb-3">{error}</p>
        <button onClick={loadLogs} className="text-sm text-[var(--accent)] hover:underline">
          Try again
        </button>
      </div>
    );
  }

  return (
    <LogViewer
      logs={logs}
      inFlight={inFlight}
      realtimeEnabled={false}
      projectId={projectId}
      getSdk={getSdk as any}
    />
  );
}
