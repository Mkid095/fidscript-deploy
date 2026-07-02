'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { Card, Spinner } from '@fidscript/ui';
import { HugeiconsIcon } from '@hugeicons/react';
import { CheckmarkCircle03Icon } from '@hugeicons/core-free-icons';

import { LOG_LEVELS, parseLogLines, LogLine } from './log-types';
import { LogToolbar } from './log-toolbar';
import { LogToggle } from './log-toggle';
import { LogContent } from './log-content';

interface LogViewerProps {
  logs: string;
  inFlight?: boolean;
  realtimeEnabled?: boolean;
  deploymentId?: string;
  projectId?: string;
  getSdk?: () => { realtime?: any };
}

export function LogViewer({ 
  logs: initialLogs, 
  inFlight = false,
  realtimeEnabled = false,
  deploymentId,
  projectId,
  getSdk,
}: LogViewerProps) {
  const [expanded, setExpanded] = useState(inFlight);
  const [activeLevels, setActiveLevels] = useState<Set<string>>(new Set(LOG_LEVELS));
  const [search, setSearch] = useState('');
  const [lines, setLines] = useState<LogLine[]>(() => parseLogLines(initialLogs));
  const [isStreaming, setIsStreaming] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [autoScroll, setAutoScroll] = useState(true);
  const newLogsRef = useRef<LogLine[]>([]);
  const streamIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Update lines when initialLogs prop changes (from parent polling)
  useEffect(() => {
    const newLines = parseLogLines(initialLogs);
    if (newLines.length > lines.length) {
      // Find truly new lines
      const existingIds = new Set(lines.map(l => l.id));
      const trulyNew = newLines.filter(l => !existingIds.has(l.id));
      if (trulyNew.length > 0) {
        newLogsRef.current = [...newLogsRef.current, ...trulyNew];
        setLastUpdate(new Date());
      }
    }
    setLines(newLines);
  }, [initialLogs]);

  // Flush new logs to visible list periodically (batch updates for performance)
  useEffect(() => {
    if (newLogsRef.current.length === 0) return;
    
    const interval = setInterval(() => {
      if (newLogsRef.current.length > 0) {
        setLines(prev => {
          const existingIds = new Set(prev.map(l => l.id));
          const trulyNew = newLogsRef.current.filter(l => !existingIds.has(l.id));
          if (trulyNew.length === 0) return prev;
          return [...prev, ...trulyNew];
        });
        newLogsRef.current = [];
      }
    }, 500);

    return () => clearInterval(interval);
  }, []);

  // Real-time subscription
  useEffect(() => {
    if (!realtimeEnabled || !deploymentId || !getSdk) return;

    const sdk = getSdk();
    const rt = (sdk as any)?.realtime;
    if (!rt) return;

    const token = typeof window !== 'undefined'
      ? (localStorage.getItem('fidscript_access_token') ?? localStorage.getItem('fidscript_token') ?? '')
      : '';

    setIsStreaming(true);
    let cancelled = false;

    rt.connect(() => token, projectId).then(() => {
      if (cancelled) return;

      const handler = (evt: { type?: string; data?: { log?: { id?: string; ts?: string; timestamp?: string; level?: string; text?: string; message?: string } } }) => {
        if (evt.type !== 'logs.log.ingested' && evt.type !== 'deployment.log') return;
        
        const log = evt.data?.log;
        if (!log) return;
        
        const newLog: LogLine = {
          id: log.id ?? `stream-${Date.now()}-${Math.random()}`,
          ts: log.ts ?? log.timestamp ?? new Date().toISOString(),
          level: (log.level ?? 'info') as LogLine['level'],
          text: log.text ?? log.message ?? '',
        };
        
        newLogsRef.current = [...newLogsRef.current, newLog];
        setLastUpdate(new Date());
      };

      const unsub = rt.subscribeDeployments(deploymentId, handler);
      if (cancelled) { unsub(); }
    });

    return () => { cancelled = true; };
  }, [realtimeEnabled, deploymentId, projectId, getSdk]);

  const filtered = lines.filter(l =>
    activeLevels.has(l.level) &&
    (!search || l.text.toLowerCase().includes(search.toLowerCase()))
  );

  // Auto-scroll to bottom when new logs arrive
  useEffect(() => {
    if (!autoScroll) return;
    const el = containerRef.current;
    if (el) {
      el.scrollTop = el.scrollHeight;
    }
  }, [filtered.length, autoScroll, lastUpdate]);

  function toggleLevel(lvl: string) {
    setActiveLevels(prev => {
      const next = new Set(prev);
      next.has(lvl) ? next.delete(lvl) : next.add(lvl);
      return next;
    });
  }

  function copyAll() {
    navigator.clipboard.writeText(filtered.map(l => l.text).join('\n'));
  }

  function downloadLogs() {
    const blob = new Blob(
      [filtered.map(l => `[${l.ts}] ${l.level.toUpperCase()} ${l.text}`).join('\n')],
      { type: 'text/plain' }
    );
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `build-logs-${Date.now()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function handleScroll() {
    const el = containerRef.current;
    if (!el) return;
    const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 64;
    setAutoScroll(atBottom);
  }

  return (
    <Card className="border border-[var(--rail)] p-0 overflow-hidden">
      <LogToolbar
        inFlight={inFlight}
        filteredLength={filtered.length}
        search={search}
        onSearchChange={setSearch}
        activeLevels={activeLevels}
        onToggleLevel={toggleLevel}
        onCopyAll={copyAll}
        onDownloadLogs={downloadLogs}
        autoScroll={autoScroll}
        onAutoScrollToggle={() => setAutoScroll(s => !s)}
        isStreaming={isStreaming}
        lastUpdate={lastUpdate}
      />
      <LogToggle
        expanded={expanded}
        onToggle={() => setExpanded(v => !v)}
        filteredLength={filtered.length}
        inFlight={inFlight}
      />
      {expanded && (
        <LogContent
          containerRef={containerRef}
          filtered={filtered}
          inFlight={inFlight}
          onScroll={handleScroll}
          isStreaming={isStreaming}
        />
      )}
    </Card>
  );
}
