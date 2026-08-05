// Business logic hooks for LogViewer — real-time streaming, filtering, and log fetching.

import { useCallback, useEffect, useRef, useState } from 'react';
import { LogLine, parseLogLines } from './log-types';

const FLUSH_INTERVAL_MS = 500;

/**
 * Manages the batched log buffer and streaming state.
 * Returns the accumulated lines and a function to append new logs.
 */
export function useLogBuffer(initialLogs: string) {
  const [lines, setLines] = useState<LogLine[]>(() => parseLogLines(initialLogs));
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const newLogsRef = useRef<LogLine[]>([]);

  // Sync lines when the polled source delivers more
  useEffect(() => {
    const newLines = parseLogLines(initialLogs);
    if (newLines.length <= lines.length) {
      setLines(newLines);
      return;
    }
    const existingIds = new Set(lines.map(l => l.id));
    const trulyNew = newLines.filter(l => !existingIds.has(l.id));
    if (trulyNew.length > 0) {
      newLogsRef.current = [...newLogsRef.current, ...trulyNew];
      setLastUpdate(new Date());
    }
    setLines(newLines);
  }, [initialLogs]); // eslint-disable-line react-hooks/exhaustive-deps

  // Flush buffered logs to visible list on interval (batched for perf)
  useEffect(() => {
    const interval = setInterval(() => {
      if (newLogsRef.current.length === 0) return;
      setLines(prev => {
        const existingIds = new Set(prev.map(l => l.id));
        const trulyNew = newLogsRef.current.filter(l => !existingIds.has(l.id));
        if (trulyNew.length === 0) return prev;
        return [...prev, ...trulyNew];
      });
      newLogsRef.current = [];
    }, FLUSH_INTERVAL_MS);
    return () => clearInterval(interval);
  }, []);

  const appendLog = useCallback((log: LogLine) => {
    newLogsRef.current = [...newLogsRef.current, log];
    setLastUpdate(new Date());
  }, []);

  return { lines, setLines, lastUpdate, appendLog };
}

/** Subscribes to realtime logs and calls appendLog for each incoming event. */
export function useLogStream({
  realtimeEnabled,
  deploymentId,
  projectId,
  getSdk,
  appendLog,
}: {
  realtimeEnabled?: boolean;
  deploymentId?: string;
  projectId?: string;
  getSdk?: () => { realtime?: unknown };
  appendLog: (log: LogLine) => void;
}) {
  const [isStreaming, setIsStreaming] = useState(false);

  useEffect(() => {
    if (!realtimeEnabled || !deploymentId || !getSdk) return;

    const sdk = getSdk();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const rt = (sdk as any)?.realtime;
    if (!rt) return;

    const token =
      typeof window !== 'undefined'
        ? (localStorage.getItem('fidscript_access_token') ?? localStorage.getItem('fidscript_token') ?? '')
        : '';

    setIsStreaming(true);
    let cancelled = false;

    rt.connect(() => token, projectId).then(() => {
      if (cancelled) return;

      const handler = (evt: {
        type?: string;
        data?: { log?: { id?: string; ts?: string; timestamp?: string; level?: string; text?: string; message?: string } };
      }) => {
        if (evt.type !== 'logs.log.ingested' && evt.type !== 'deployment.log') return;
        const log = evt.data?.log;
        if (!log) return;

        appendLog({
          id: log.id ?? `stream-${Date.now()}-${Math.random()}`,
          ts: log.ts ?? log.timestamp ?? new Date().toISOString(),
          level: (log.level ?? 'info') as LogLine['level'],
          text: log.text ?? log.message ?? '',
        });
      };

      const unsub = rt.subscribeDeployments(deploymentId, handler);
      if (cancelled) { (unsub as () => void)(); }
    });

    return () => { cancelled = true; };
  }, [realtimeEnabled, deploymentId, projectId, getSdk, appendLog]);

  return { isStreaming };
}

/** Derives filtered log lines from raw lines + filter state. */
export function useLogFilter(lines: LogLine[], activeLevels: Set<string>, search: string) {
  return lines.filter(l =>
    activeLevels.has(l.level) &&
    (!search || l.text.toLowerCase().includes(search.toLowerCase()))
  );
}
