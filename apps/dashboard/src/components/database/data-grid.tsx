'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { useDatabase } from '@/app/(app)/projects/[projectId]/databases/database-context';
import { ConfirmDialog } from '@/components/deployments/confirm-dialog';
import { HugeiconsIcon } from '@hugeicons/react';
import { Add01Icon, RefreshIcon, Cancel01Icon, ArrowRight01Icon, ArrowLeft01Icon } from '@hugeicons/core-free-icons';

interface DataGridProps {
  table: string;
  state: { data: Record<string, unknown>[]; total: number; loading: boolean; error?: string };
  onRefresh: () => void;
  isRealtime: boolean;
  columns?: import('@/types').ColumnInfo[];
}

const PAGE_SIZE = 50;

export function DataGrid({ table, state, onRefresh, isRealtime, columns: colInfos }: DataGridProps) {
  const { getSdk } = useAuth();
  const { databaseId, insertRow, updateRow, deleteRows } = useDatabase();
  const [page, setPage] = useState(1);
  const [selectedIds, setSelectedIds] = useState<Set<unknown>>(new Set());
  const [showInsertModal, setShowInsertModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [editingRow, setEditingRow] = useState<Record<string, unknown> | null>(null);
  const unsubRef = useRef<(() => void) | null>(null);

  // Subscribe to realtime changes when isRealtime is true
  useEffect(() => {
    if (!isRealtime || !databaseId) return;
    const sdk = getSdk();
    let mounted = true;
    sdk.database(databaseId).from(table).subscribe((event: unknown) => {
      if (!mounted) return;
      const e = event as { eventType: string; old: unknown; new: unknown };
      // INSERT or UPDATE: refresh the data
      if (e.eventType === 'INSERT' || e.eventType === 'UPDATE') {
        onRefresh();
      }
      // DELETE: refresh the data
      if (e.eventType === 'DELETE') {
        onRefresh();
      }
    }).then(sub => {
      if (mounted) unsubRef.current = () => sub.unsubscribe();
    }).catch(() => {
      // realtime not available — ignore
    });
    return () => {
      mounted = false;
      unsubRef.current?.();
      unsubRef.current = null;
    };
  }, [isRealtime, databaseId, table, getSdk, onRefresh]);
  const [mutating, setMutating] = useState(false);
  const [mutateMsg, setMutateMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const totalPages = Math.max(1, Math.ceil((state.total ?? 0) / PAGE_SIZE));
  const primaryKey = (colInfos?.find(c => c.isPrimaryKey)?.name
    ?? (state.data && state.data.length > 0 && 'id' in state.data[0] ? 'id'
      : (state.data && state.data.length > 0 && Object.keys(state.data[0]).length > 0 ? Object.keys(state.data[0])[0] : 'id'))) as string;

  // Reset on table change
  useEffect(() => { setPage(1); setSelectedIds(new Set()); }, [table]);

  // Reset selection when data changes
  useEffect(() => { setSelectedIds(new Set()); }, [state.data]);

  const showMsg = useCallback((type: 'success' | 'error', text: string) => {
    setMutateMsg({ type, text });
    setTimeout(() => setMutateMsg(null), 3000);
  }, []);

  const handleInsert = async (row: Record<string, unknown>) => {
    setMutating(true);
    const result = await insertRow(table, row);
    setMutating(false);
    if (result.success) {
      showMsg('success', 'Row inserted successfully.');
      setShowInsertModal(false);
      onRefresh();
    } else {
      showMsg('error', result.error ?? 'Insert failed.');
    }
  };

  const handleUpdate = async (pkValue: unknown, patch: Record<string, unknown>) => {
    setMutating(true);
    const result = await updateRow(table, pkValue, patch);
    setMutating(false);
    if (result.success) {
      showMsg('success', 'Row updated successfully.');
      setEditingRow(null);
      onRefresh();
    } else {
      showMsg('error', result.error ?? 'Update failed.');
    }
  };

  const handleDelete = async () => {
    if (selectedIds.size === 0) return;
    setMutating(true);
    const ids = Array.from(selectedIds);
    const result = await deleteRows(table, ids);
    setMutating(false);
    if (result.success) {
      showMsg('success', `${ids.length} row(s) deleted.`);
      setSelectedIds(new Set());
      setShowDeleteConfirm(false);
      onRefresh();
    } else {
      showMsg('error', result.error ?? 'Delete failed.');
    }
  };

  const columns_ = state.data && state.data.length > 0 ? Object.keys(state.data[0]) : [];

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* Toolbar */}
      <div className="flex items-center gap-2 px-3 py-2 border-b border-[var(--rail)] bg-[var(--surface)] flex-shrink-0">
        <h3 className="text-sm font-semibold text-[var(--text)] font-mono">{table}</h3>
        {isRealtime && (
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 font-bold">LIVE</span>
        )}
        <span className="text-[10px] text-[var(--text-dim)] font-mono ml-1">{(state.total ?? 0).toLocaleString()} rows</span>
        <div className="flex-1" />
        {mutateMsg && (
          <span className={`text-xs ${mutateMsg.type === 'success' ? 'text-emerald-400' : 'text-rose-400'}`}>{mutateMsg.text}</span>
        )}
        <button
          onClick={() => setShowInsertModal(true)}
          className="text-xs px-2.5 py-1 rounded border border-[var(--rail)] text-[var(--text-dim)] hover:text-[var(--text)] hover:border-[var(--accent)]/50"
        >
          <HugeiconsIcon icon={Add01Icon} className="text-xs" size={14} />
          Insert row
        </button>
        <button
          onClick={onRefresh}
          disabled={state.loading}
          className="text-xs px-2.5 py-1 rounded border border-[var(--rail)] text-[var(--text-dim)] hover:text-[var(--text)] disabled:opacity-50"
        >
          {state.loading ? '…' : 'Refresh'}
        </button>
      </div>

      {/* Delete banner */}
      {selectedIds.size > 0 && (
        <div className="flex items-center gap-3 px-3 py-2 bg-rose-500/10 border-b border-rose-500/30 flex-shrink-0">
          <span className="text-xs text-rose-400 font-medium">{selectedIds.size} row(s) selected</span>
          <button
            onClick={() => setShowDeleteConfirm(true)}
            className="text-xs px-2.5 py-1 rounded bg-rose-500/20 border border-rose-500/40 text-rose-400 hover:bg-rose-500/30"
          >
            Delete selected
          </button>
          <button onClick={() => setSelectedIds(new Set())} className="text-rose-400/70 hover:text-rose-400 ml-auto p-0.5 rounded hover:bg-rose-500/10">
            <HugeiconsIcon icon={Cancel01Icon} size={14} />
          </button>
        </div>
      )}

      {/* Error */}
      {state.error && (
        <div className="px-4 py-2 bg-rose-500/10 border-b border-rose-500/30 flex-shrink-0">
          <span className="text-xs text-rose-400 font-mono">{state.error}</span>
        </div>
      )}

      {/* Table */}
      <div className="flex-1 overflow-auto min-h-0">
        {state.loading && (!state.data || state.data.length === 0) ? (
          <div className="flex items-center justify-center h-32 text-xs text-[var(--text-dim)]">Loading rows…</div>
        ) : !state.data || state.data.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-32 text-xs text-[var(--text-dim)]">
            <p>Table <code className="text-[var(--text-muted)] font-mono">{table}</code> is empty.</p>
            <button
              onClick={() => setShowInsertModal(true)}
              className="mt-2 text-xs text-[var(--accent)] hover:underline"
            >
              Insert the first row
              <HugeiconsIcon icon={ArrowRight01Icon} size={12} className="inline ml-1" />
            </button>
          </div>
        ) : (
          <table className="w-full text-xs">
            <thead className="bg-[var(--surface)] sticky top-0 z-10">
              <tr className="border-b border-[var(--rail)]">
                <th className="w-8 px-2 py-2">
                  <input
                    type="checkbox"
                    className="accent-[var(--accent)]"
                    checked={(state.data ? selectedIds.size === state.data.length && state.data.length > 0 : false)}
                    onChange={e => {
                      if (e.target.checked) setSelectedIds(new Set((state.data ?? []).map(r => r[primaryKey as string])));
                      else setSelectedIds(new Set());
                    }}
                  />
                </th>
                {columns_.map(c => (
                  <th key={c} className="text-left px-3 py-2 font-mono font-semibold text-[var(--text-dim)] uppercase tracking-wider text-[10px]">
                    {c}
                  </th>
                ))}
                <th className="w-16 px-3 py-2" />
              </tr>
            </thead>
            <tbody>
              {(state.data ?? []).map((row, i) => (
                <tr
                  key={i}
                  className={`border-b border-[var(--rail)]/40 hover:bg-[var(--rail)]/20 ${selectedIds.has(row[primaryKey]) ? 'bg-rose-500/5' : ''}`}
                >
                  <td className="px-2 py-1.5">
                    <input
                      type="checkbox"
                      className="accent-[var(--accent)]"
                      checked={selectedIds.has(row[primaryKey])}
                      onChange={() => {
                        setSelectedIds(prev => {
                          const next = new Set(prev);
                          if (next.has(row[primaryKey])) next.delete(row[primaryKey]);
                          else next.add(row[primaryKey]);
                          return next;
                        });
                      }}
                    />
                  </td>
                  {columns_.map(c => (
                    <td
                      key={c}
                      className="px-3 py-1.5 font-mono text-[var(--text-muted)] max-w-48 truncate"
                      title={String(row[c] ?? 'NULL')}
                    >
                      {row[c] === null
                        ? <span className="text-[var(--text-dim)] italic">NULL</span>
                        : typeof row[c] === 'object' ? JSON.stringify(row[c])
                        : String(row[c])}
                    </td>
                  ))}
                  <td className="px-3 py-1.5">
                    <button
                      onClick={() => setEditingRow(row)}
                      className="text-[10px] text-[var(--text-dim)] hover:text-[var(--accent)]"
                    >
                      Edit
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between px-3 py-2 border-t border-[var(--rail)] bg-[var(--surface)] flex-shrink-0 text-xs text-[var(--text-dim)]">
        <span>
          Page {page} of {totalPages} · {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, state.total ?? 0)} of {(state.total ?? 0).toLocaleString()}
        </span>
        <div className="flex gap-1.5">
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
            className="px-2.5 py-1 rounded border border-[var(--rail)] disabled:opacity-40 hover:text-[var(--text)] flex items-center gap-1"
          >
            <HugeiconsIcon icon={ArrowLeft01Icon} size={12} />Prev</button>
          {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
            const pageNum = Math.max(1, Math.min(totalPages - 4, page - 2)) + i;
            if (pageNum > totalPages) return null;
            return (
              <button
                key={pageNum}
                onClick={() => setPage(pageNum)}
                className={`w-8 py-1 rounded border ${page === pageNum ? 'border-[var(--accent)] text-[var(--accent)]' : 'border-[var(--rail)] text-[var(--text-dim)] hover:text-[var(--text)]'}`}
              >{pageNum}</button>
            );
          })}
          <button
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="px-2.5 py-1 rounded border border-[var(--rail)] disabled:opacity-40 hover:text-[var(--text)] flex items-center gap-1"
          >Next<HugeiconsIcon icon={ArrowRight01Icon} size={12} /></button>
        </div>
      </div>

      {/* Insert Row Modal */}
      {showInsertModal && (
        <InsertRowModal
          table={table}
          columns={colInfos ?? []}
          onSubmit={handleInsert}
          onClose={() => setShowInsertModal(false)}
          mutating={mutating}
        />
      )}

      {/* Edit Row Modal */}
      {editingRow && (
        <EditRowModal
          table={table}
          row={editingRow}
          columns={colInfos ?? []}
          primaryKey={primaryKey}
          onSubmit={handleUpdate}
          onClose={() => setEditingRow(null)}
          mutating={mutating}
        />
      )}

      {/* Delete Confirmation */}
      {showDeleteConfirm && (
        <ConfirmDialog
          title="Delete Rows"
          message={`Are you sure you want to delete ${selectedIds.size} row(s) from "${table}"? This cannot be undone.`}
          confirmLabel={`Delete ${selectedIds.size} row(s)`}
          variant="danger"
          onConfirm={handleDelete}
          onClose={() => setShowDeleteConfirm(false)}
        />
      )}
    </div>
  );
}

// ─── Insert Modal ─────────────────────────────────────────────────────────────

function InsertRowModal({
  table, columns, onSubmit, onClose, mutating,
}: {
  table: string;
  columns: import('@/types').ColumnInfo[];
  onSubmit: (row: Record<string, unknown>) => void;
  onClose: () => void;
  mutating: boolean;
}) {
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
          <button onClick={onClose} className="text-[var(--text-dim)] hover:text-[var(--text)] p-1 rounded hover:bg-[var(--rail)]">
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
          <button type="button" onClick={onClose} className="text-xs px-3 py-1.5 rounded border border-[var(--rail)] text-[var(--text-dim)] hover:text-[var(--text)]">Cancel</button>
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

// ─── Edit Modal ───────────────────────────────────────────────────────────────

function EditRowModal({
  table, row, columns, primaryKey, onSubmit, onClose, mutating,
}: {
  table: string;
  row: Record<string, unknown>;
  columns: import('@/types').ColumnInfo[];
  primaryKey: string;
  onSubmit: (pkValue: unknown, patch: Record<string, unknown>) => void;
  onClose: () => void;
  mutating: boolean;
}) {
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
          <h3 className="text-sm font-semibold text-[var(--text)]">Edit {table} [{String(row[primaryKey])}]</h3>
          <button onClick={onClose} className="text-[var(--text-dim)] hover:text-[var(--text)] p-1 rounded hover:bg-[var(--rail)]">
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
          <button type="button" onClick={onClose} className="text-xs px-3 py-1.5 rounded border border-[var(--rail)] text-[var(--text-dim)] hover:text-[var(--text)]">Cancel</button>
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

// ─── Helpers ──────────────────────────────────────────────────────────────────

function parseCellValue(value: string, type: string): unknown {
  if (value === '' || value === 'NULL') return null;
  if (['integer', 'smallint', 'bigint', 'bigserial', 'serial'].some(t => type.includes(t))) {
    return BigInt(value);
  }
  if (['float4', 'float8', 'real', 'numeric', 'decimal'].some(t => type.includes(t))) {
    return parseFloat(value);
  }
  if (type === 'boolean') return value === 'true' || value === '1';
  if (type.startsWith('_')) return value.split(',');
  return value;
}
