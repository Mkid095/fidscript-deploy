'use client';

import { HugeiconsIcon } from '@hugeicons/react';
import { HistoryIcon } from '@hugeicons/core-free-icons';
import { useDatabase } from '@/app/(app)/projects/[projectId]/databases/database-context';
import { inferTabName } from './sql-editor.utils';

interface SqlEditorHistoryProps {
  addTab: (sql?: string, name?: string) => void;
}

export function SqlEditorHistory({ addTab }: SqlEditorHistoryProps) {
  const { queryHistory } = useDatabase();
  if (queryHistory.length === 0) return null;
  return (
    <div className="border-t border-[var(--rail)] flex-shrink-0 max-h-40 overflow-y-auto">
      <div className="px-2 py-1.5">
        <p className="text-[9px] uppercase tracking-wider text-[var(--text-dim)] font-semibold mb-1 px-1">History</p>
        {queryHistory.slice(0, 10).map(h => (
          <button
            key={h.id}
            onClick={() => { addTab(h.sql, inferTabName(h.sql)); }}
            className="w-full flex items-center gap-1.5 px-1.5 py-1 rounded text-[10px] text-[var(--text-dim)] hover:text-[var(--text)] hover:bg-[var(--rail)]/30 text-left"
            title={h.sql}
          >
            <HugeiconsIcon icon={HistoryIcon} size={10} className="flex-shrink-0" />
            <span className="truncate font-mono">{h.sql.slice(0, 30)}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
