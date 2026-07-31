'use client';

import { useEffect, useRef, useState } from 'react';

interface ConfigLog { text: string; ok: boolean; }
interface ProgressEvent { type?: string; status?: string; failureReason?: string; currentStep?: string; }

interface ConfigureData {
  platformName: string;
  platformDomain: string;
  serverIp: string;
  adminEmail: string;
  authMethod: 'PASSWORD' | 'MAGIC_CODE';
  adminPassword: string;
}

interface UseConfigureSSEOptions {
  configureData: ConfigureData;
  onComplete: () => void;
}

export function useConfigureSSE({ configureData, onComplete }: UseConfigureSSEOptions) {
  const [configLogs, setConfigLogs] = useState<ConfigLog[]>([]);
  const [configComplete, setConfigComplete] = useState(false);
  const eventSourceRef = useRef<EventSource | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function runConfigure() {
      setConfigLogs([{ text: 'Starting configuration…', ok: true }]);

      try {
        const res = await fetch('/api/v1/installation/configure', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            platformName: configureData.platformName,
            platformDomain: configureData.platformDomain,
            serverIp: configureData.serverIp,
            adminEmail: configureData.adminEmail,
            authMethod: configureData.authMethod,
            adminPassword: configureData.authMethod === 'PASSWORD' ? configureData.adminPassword : undefined,
          }),
        });

        if (!res.ok) {
          const err = await res.json().catch(() => ({ message: 'Configuration failed' }));
          if (!cancelled) setConfigLogs(prev => [...prev, { text: `Error: ${err.message}`, ok: false }]);
          return;
        }

        const { operationId } = await res.json() as { operationId: string };
        openSSE(operationId);
      } catch (err) {
        if (!cancelled) setConfigLogs(prev => [...prev, { text: err instanceof Error ? err.message : 'Configuration failed', ok: false }]);
      }
    }

    function openSSE(operationId: string) {
      eventSourceRef.current?.close();
      const es = new EventSource(`/api/v1/installation/operations/${operationId}/stream`);
      eventSourceRef.current = es;

      es.onmessage = (e: MessageEvent) => {
        if (cancelled) { es.close(); return; }
        try {
          const data = JSON.parse(e.data as string) as ProgressEvent;

          if (data.type === 'error') {
            setConfigLogs(prev => [...prev, { text: `Error: ${data.type}`, ok: false }]);
            es.close();
            return;
          }

          if (data.status === 'COMPLETED') {
            setConfigLogs(prev => [...prev, { text: 'Platform configured successfully.', ok: true }]);
            setConfigComplete(true);
            es.close();
            if (!cancelled) setTimeout(onComplete, 800);
            return;
          }

          if (data.status === 'FAILED') {
            setConfigLogs(prev => [...prev, { text: `Failed: ${data.failureReason ?? 'Unknown error'}`, ok: false }]);
            es.close();
            return;
          }

          if (data.currentStep) {
            setConfigLogs(prev => {
              const last = prev[prev.length - 1];
              if (last && last.text.startsWith('Starting')) {
                return [...prev.slice(0, -1), { text: ` ${last.text.slice(2)}`, ok: true }, { text: ` ${data.currentStep}`, ok: true }];
              }
              return [...prev, { text: ` ${data.currentStep}`, ok: true }];
            });
          }
        } catch { /* ignore parse errors */ }
      };

      es.onerror = () => {
        if (!cancelled) {
          setConfigLogs(prev => [...prev, { text: 'Lost connection to the server. Please refresh and try again.', ok: false }]);
          es.close();
        }
      };
    }

    runConfigure();
    return () => { cancelled = true; eventSourceRef.current?.close(); };
  }, [configureData, onComplete]);

  return { configLogs, configComplete };
}
