'use client';

import { useState } from 'react';
import { HugeiconsIcon } from '@hugeicons/react';
import { Cancel01Icon } from '@hugeicons/core-free-icons';
import type { ColumnInfo } from '@/types';
import { parseCellValue } from './data-grid-utils';

interface EditRowModalProps {
  table: string;
  row: Record<string, unknown>;
  columns: ColumnInfo[];
  primaryKey: string;
  onSubmit: (pkValue: unknown, patch: Record<string, unknown>) => void;
  onClose: () => void;
  mutating: boolean;
}

export function EditRowModal({
  table, row, columns, primaryKey, onSubmit, onClose, mutating,
}: EditRowModalProps) {
  const [values, setValues] = useState<Record<string, string>>(
    Object.fromEntries(Object.entries(row).map(([k, v]) => [k, v === null ? 'NULL' : String(v)]))
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const patch: Record<string, unknown> = {};
    for (const col of columns) {
      if (col.name === primaryKey) continue;
      if (values[col.name] !== undefined) {
        patch[col.name] = values[col.name] === 'NULL' ? null : parseCellValue(values[col.name], col.type);
      }
    }
    onSubmit(row[primaryKey], patch);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-[var(--surface)] border border-[var(--rail)] rounded-lg shadow-2xl w-full max-w-lg mx-4 max-h-[80vh] flex flex-col">
        <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--rail)]">
          <h3 className="text-sm font-semibold text-[var(--text)]">
            Edit {table} [{String(row[primaryKey])}]
          </h3>
          <button
            onClick={onClose}
            className="text-[var(--text-dim)] hover:text-[var(--text)] p-1 rounded hover:bg-[var(--rail)]"
          >
            <HugeiconsIcon icon={Cancel01Icon} size={16} />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-4 space-y-3">
          {columns.filter(c => c.name !== primaryKey).map(col => (
            <div key={col.name} className="flex flex-col gap-1">
              <label className="text-[10px] uppercase tracking-wider text-[var(--text-dim)] font-semibold flex items-center gap-1">
                {col.name}
                <span className="opacity-50 font-normal normal-case tracking-normal">{col.type}</span>
                {!col.isNullable && <span className="text-rose-400 ml-1">NOT NULL</span>}
              </label>
              <input
                type="text"
                value={values[col.name] ?? ''}
                onChange={e => setValues(v => ({ ...v, [col.name]: e.target.value }))}
                className="bg-[var(--surface-2)] border border-[var(--rail)] text-[var(--text)] rounded px-2.5 py-1.5 text-xs font-mono focus:outline-none focus:border-[var(--accent)]/50"
              />
            </div>
          ))}
        </form>
        <div className="flex items-center justify-end gap-2 px-4 py-3 border-t border-[var(--rail)]">
          <button
            type="button"
            onClick={onClose}
            className="text-xs px-3 py-1.5 rounded border border-[var(--rail)] text-[var(--text-dim)] hover:text-[var(--text)]"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={mutating}
            className="text-xs px-3 py-1.5 rounded bg-[var(--accent)] hover:bg-[var(--accent-dim)] text-[var(--text)] font-medium disabled:opacity-50"
          >
            {mutating ? 'Saving…' : 'Save changes'}
          </button>
        </div>
      </div>
    </div>
  );
}
