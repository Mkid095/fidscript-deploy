'use client';

import { HugeiconsIcon } from '@hugeicons/react';
import { Bookmark02Icon } from '@hugeicons/core-free-icons';
import { useDatabase } from '@/app/(app)/projects/[projectId]/databases/database-context';

interface SqlEditorSavedQueriesProps {
  activeTabId: string;
  updateTab: (id: string, patch: { sql: string; dirty?: boolean; name?: string }) => void;
}

export function SqlEditorSavedQueries({ activeTabId, updateTab }: SqlEditorSavedQueriesProps) {
  const { savedQueries } = useDatabase();
  if (savedQueries.length === 0) return null;
  return (
    <div className="border-t border-[var(--rail)] flex-shrink-0 max-h-40 overflow-y-auto">
      <div className="px-2 py-1.5">
        <p className="text-[9px] uppercase tracking-wider text-[var(--text-dim)] font-semibold mb-1 px-1">Saved</p>
        {savedQueries.slice(0, 10).map(sq => (
          <button
            key={sq.id}
            onClick={() => updateTab(activeTabId, { sql: sq.sql, dirty: false, name: sq.name })}
            className="w-full flex items-center gap-1.5 px-1.5 py-1 rounded text-[10px] text-[var(--text-dim)] hover:text-[var(--text)] hover:bg-[var(--rail)]/30 text-left truncate"
          >
            <HugeiconsIcon icon={Bookmark02Icon} size={10} className="flex-shrink-0" />
            <span className="truncate">{sq.name}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
