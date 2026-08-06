'use client';

import { HugeiconsIcon } from '@hugeicons/react';
import { Add01Icon, RefreshIcon, Cancel01Icon } from '@hugeicons/core-free-icons';

interface DataGridToolbarProps {
  table: string;
  total: number;
  loading: boolean;
  isRealtime: boolean;
  mutateMsg: { type: 'success' | 'error'; text: string } | null;
  onInsert: () => void;
  onRefresh: () => void;
}

export function DataGridToolbar({
  table, total, loading, isRealtime, mutateMsg, onInsert, onRefresh,
}: DataGridToolbarProps) {
  return (
    <div className="flex items-center gap-2 px-3 py-2 border-b border-[var(--rail)] bg-[var(--surface)] flex-shrink-0">
      <h3 className="text-sm font-semibold text-[var(--text)] font-mono">{table}</h3>
      {isRealtime && (
        <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 font-bold">LIVE</span>
      )}
      <span className="text-[10px] text-[var(--text-dim)] font-mono ml-1">{total.toLocaleString()} rows</span>
      <div className="flex-1" />
      {mutateMsg && (
        <span className={`text-xs ${mutateMsg.type === 'success' ? 'text-emerald-400' : 'text-rose-400'}`}>
          {mutateMsg.text}
        </span>
      )}
      <button
        onClick={onInsert}
        className="text-xs px-2.5 py-1 rounded border border-[var(--rail)] text-[var(--text-dim)] hover:text-[var(--text)] hover:border-[var(--accent)]/50"
      >
        <HugeiconsIcon icon={Add01Icon} className="text-xs" size={14} />
        Insert row
      </button>
      <button
        onClick={onRefresh}
        disabled={loading}
        className="text-xs px-2.5 py-1 rounded border border-[var(--rail)] text-[var(--text-dim)] hover:text-[var(--text)] disabled:opacity-50"
      >
        {loading ? '…' : 'Refresh'}
      </button>
    </div>
  );
}

interface DeleteBannerProps {
  count: number;
  onDelete: () => void;
  onClear: () => void;
}

export function DeleteBanner({ count, onDelete, onClear }: DeleteBannerProps) {
  return (
    <div className="flex items-center gap-3 px-3 py-2 bg-rose-500/10 border-b border-rose-500/30 flex-shrink-0">
      <span className="text-xs text-rose-400 font-medium">{count} row(s) selected</span>
      <button
        onClick={onDelete}
        className="text-xs px-2.5 py-1 rounded bg-rose-500/20 border border-rose-500/40 text-rose-400 hover:bg-rose-500/30"
      >
        Delete selected
      </button>
      <button
        onClick={onClear}
        aria-label="Clear selection"
        className="text-rose-400/70 hover:text-rose-400 ml-auto p-0.5 rounded hover:bg-rose-500/10"
      >
        <HugeiconsIcon icon={Cancel01Icon} size={14} />
      </button>
    </div>
  );
}

export function ErrorBanner({ message }: { message: string }) {
  return (
    <div className="px-4 py-2 bg-rose-500/10 border-b border-rose-500/30 flex-shrink-0">
      <span className="text-xs text-rose-400 font-mono">{message}</span>
    </div>
  );
}
