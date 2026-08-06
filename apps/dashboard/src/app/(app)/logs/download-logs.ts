'use client';

import type { LogEntry } from '@/types';

export interface DownloadContext {
  projectId: string;
  stream: string;
  search: string;
}

/**
 * Triggers a browser download of the given logs as JSON.
 * Filename includes the project id + ISO timestamp for traceability.
 */
export function downloadLogs(logs: LogEntry[], ctx: DownloadContext): void {
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const filename = `logs-${ctx.projectId || 'project'}-${stamp}.json`;
  const payload = {
    exportedAt: new Date().toISOString(),
    projectId: ctx.projectId,
    stream: ctx.stream,
    search: ctx.search,
    count: logs.length,
    logs,
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}