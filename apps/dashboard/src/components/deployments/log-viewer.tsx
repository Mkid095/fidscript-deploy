'use client';

import { useState, useRef, useCallback } from 'react';
import { Card } from '@fidscript/ui';
import { LogToolbar } from './log-toolbar';
import { LogToggle } from './log-toggle';
import { LogContent } from './log-content';
import { LOG_LEVELS, LogLine } from './log-types';
import { useLogBuffer, useLogStream, useLogFilter } from './log-viewer-hooks';

interface LogViewerProps {
  logs: string;
  inFlight?: boolean;
  realtimeEnabled?: boolean;
  deploymentId?: string;
  projectId?: string;
  getSdk?: () => { realtime?: unknown };
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
  const [autoScroll, setAutoScroll] = useState(true);
  const containerRef = useRef<HTMLDivElement>(null);

  const { lines, lastUpdate, appendLog } = useLogBuffer(initialLogs);
  const { isStreaming } = useLogStream({
    realtimeEnabled, deploymentId, projectId, getSdk, appendLog,
  });
  const filtered = useLogFilter(lines, activeLevels, search);

  const toggleLevel = useCallback((lvl: string) => {
    setActiveLevels(prev => {
      const next = new Set(prev);
      next.has(lvl) ? next.delete(lvl) : next.add(lvl);
      return next;
    });
  }, []);

  const copyAll = useCallback(() => {
    navigator.clipboard.writeText(filtered.map(l => l.text).join('\n'));
  }, [filtered]);

  const downloadLogs = useCallback(() => {
    const blob = new Blob(
      [filtered.map(l => `[${l.ts}] ${l.level.toUpperCase()} ${l.text}`).join('\n')],
      { type: 'text/plain' },
    );
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `build-logs-${Date.now()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  }, [filtered]);

  const handleScroll = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;
    const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 64;
    setAutoScroll(atBottom);
  }, []);

  // Auto-scroll to bottom when new logs arrive
  const prevLengthRef = useRef(filtered.length);
  if (filtered.length !== prevLengthRef.current) {
    prevLengthRef.current = filtered.length;
    if (autoScroll && containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
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
