'use client';

import { useRef } from 'react';
import { Card, EmptyState, Spinner } from '@fidscript/ui';
import type { LogEntry } from '@/types';

const LEVEL_COLORS: Record<string, string> = {
  debug: 'bg-[var(--rail)] text-[var(--text-muted)]',
  info: 'bg-blue-900 text-[var(--accent)]',
  warn: 'bg-yellow-900 text-[var(--warning)]',
  error: 'bg-red-900 text-[var(--danger)]',
  fatal: 'bg-red-900 text-[var(--danger)] font-bold',
};

interface LogListProps {
  logs: LogEntry[];
  loading: boolean;
  error: string | null;
  autoScroll: boolean;
  onClear: () => void;
}

export function LogList({ logs, loading, error, autoScroll, onClear }: LogListProps) {
  const listRef = useRef<HTMLDivElement>(null);

  return (
    <>
      {error && <p className="text-[var(--danger)] mb-4 text-sm">{error}</p>}
      {loading && logs.length === 0 ? (
        <div className="flex items-center justify-center min-h-48"><Spinner size="lg" /></div>
      ) : logs.length === 0 ? (
        <Card className="border border-[var(--rail)]"><EmptyState title="No logs" description="No log entries match the current filters." /></Card>
      ) : (
        <Card className="border border-[var(--rail)] overflow-hidden">
          <div ref={listRef} className="bg-[#0a0a0f] text-[var(--text-muted)] font-mono text-xs overflow-y-auto" style={{ maxHeight: 600 }}>
            <table className="w-full">
              <thead className="sticky top-0 bg-[#0a0a0f] border-b border-[var(--rail)]">
                <tr>
                  <th className="text-left text-[var(--text-muted)] font-medium px-4 py-2 w-40">Time</th>
                  <th className="text-left text-[var(--text-muted)] font-medium px-4 py-2 w-20">Level</th>
                  <th className="text-left text-[var(--text-muted)] font-medium px-4 py-2">Message</th>
                </tr>
              </thead>
              <tbody>
                {logs.map(entry => (
                  <tr key={entry.id} className="border-b border-[var(--rail)]/50 hover:bg-[var(--rail)]/20">
                    <td className="px-4 py-1.5 text-[var(--text-muted)] whitespace-nowrap">{new Date(entry.timestamp).toLocaleTimeString()}</td>
                    <td className="px-4 py-1.5">
                      <span className={`text-xs px-1.5 py-0.5 rounded ${LEVEL_COLORS[entry.level] ?? 'bg-[var(--rail)] text-[var(--text-muted)]'}`}>{entry.level}</span>
                    </td>
                    <td className="px-4 py-1.5 text-[var(--text-muted)] whitespace-pre-wrap break-all">{entry.message}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </>
  );
}
