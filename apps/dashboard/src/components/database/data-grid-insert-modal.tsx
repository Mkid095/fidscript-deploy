'use client';

import { useState } from 'react';
import { HugeiconsIcon } from '@hugeicons/react';
import { Cancel01Icon } from '@hugeicons/core-free-icons';
import type { ColumnInfo } from '@/types';
import { parseCellValue } from './data-grid-utils';

interface InsertRowModalProps {
  table: string;
  columns: ColumnInfo[];
  onSubmit: (row: Record<string, unknown>) => void;
  onClose: () => void;
  mutating: boolean;
}

export function InsertRowModal({
  table, columns, onSubmit, onClose, mutating,
}: InsertRowModalProps) {
  const [values, setValues] = useState<Record<string, string>>({});

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const row: Record<string, unknown> = {};
    for (const col of columns) {
      if (values[col.name] !== undefined && values[col.name] !== '') {
        row[col.name] = parseCellValue(values[col.name], col.type);
      }
    }
    onSubmit(row);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-[var(--surface)] border border-[var(--rail)] rounded-lg shadow-2xl w-full max-w-lg mx-4 max-h-[80vh] flex flex-col">
        <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--rail)]">
          <h3 className="text-sm font-semibold text-[var(--text)]">Insert into {table}</h3>
          <button
            onClick={onClose}
            aria-label="Close insert dialog"
            className="text-[var(--text-dim)] hover:text-[var(--text)] p-1 rounded hover:bg-[var(--rail)]"
          >
            <HugeiconsIcon icon={Cancel01Icon} size={16} />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-4 space-y-3">
          {columns.map(col => (
            <div key={col.name} className="flex flex-col gap-1">
              <label className="text-[10px] uppercase tracking-wider text-[var(--text-dim)] font-semibold flex items-center gap-1">
                {col.name}
                <span className="opacity-50 font-normal normal-case tracking-normal">{col.type}</span>
                {col.isPrimaryKey && col.defaultValue && <span className="text-[var(--text-dim)] ml-1 text-[9px]">(auto)</span>}
                {!col.isNullable && !col.defaultValue && <span className="text-rose-400 ml-1">*</span>}
              </label>
              <input
                type="text"
                value={values[col.name] ?? ''}
                onChange={e => setValues(v => ({ ...v, [col.name]: e.target.value }))}
                placeholder={col.isNullable ? 'NULL' : col.defaultValue ?? '—'}
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
            {mutating ? 'Inserting…' : 'Insert row'}
          </button>
        </div>
      </div>
    </div>
  );
}
