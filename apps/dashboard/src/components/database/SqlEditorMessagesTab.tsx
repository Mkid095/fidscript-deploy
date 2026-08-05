'use client';

import { HugeiconsIcon } from '@hugeicons/react';
import { AlertCircleIcon, CheckmarkCircle03Icon } from '@hugeicons/core-free-icons';
import type { QueryResult } from '@/types';
import type { SqlTab } from './sql-editor.types';
import { formatDuration } from '@/lib/format';

interface SqlEditorMessagesTabProps {
  result: QueryResult | null;
  isError: boolean;
  activeTab: SqlTab;
}

export function SqlEditorMessagesTab({ result, isError, activeTab }: SqlEditorMessagesTabProps) {
  if (isError) {
    return (
      <div className="space-y-2">
        <div className="flex items-center gap-2 text-[11px] text-rose-400 font-semibold">
          <HugeiconsIcon icon={AlertCircleIcon} size={14} />
          Query failed
        </div>
        <pre className="text-[10px] font-mono text-rose-400/80 bg-rose-500/5 border border-rose-500/20 rounded p-3 overflow-auto">
          {result?.columns[0]?.replace('Error: ', '') ?? 'Unknown error'}
        </pre>
      </div>
    );
  }
  if (result) {
    return (
      <div className="space-y-3">
        <div className="flex items-center gap-2 text-[11px] text-emerald-400 font-semibold">
          <HugeiconsIcon icon={CheckmarkCircle03Icon} size={14} />
          Query executed successfully.
        </div>
        <div className="grid grid-cols-2 gap-2 text-[11px]">
          <div className="flex items-center gap-2 px-3 py-2 bg-[var(--surface-2)] rounded border border-[var(--rail)]">
            <span className="text-[var(--text-dim)]">Rows returned</span>
            <span className="font-mono font-semibold text-[var(--text)] ml-auto">{result.rowCount.toLocaleString()}</span>
          </div>
          <div className="flex items-center gap-2 px-3 py-2 bg-[var(--surface-2)] rounded border border-[var(--rail)]">
            <span className="text-[var(--text-dim)]">Execution time</span>
            <span className="font-mono font-semibold text-[var(--text)] ml-auto">{formatDuration(activeTab?.executionTimeMs ?? 0)}</span>
          </div>
        </div>
      </div>
    );
  }
  return <div className="flex items-center justify-center h-full text-[11px] text-[var(--text-dim)]">No query has been run yet.</div>;
}
