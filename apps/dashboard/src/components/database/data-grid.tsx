'use client';

import { useEffect, useRef, useState } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { useDatabase } from '@/app/(app)/projects/[projectId]/databases/database-context';
import { ConfirmDialog } from '@/components/deployments/confirm-dialog';
import { HugeiconsIcon } from '@hugeicons/react';
import { ArrowRight01Icon } from '@hugeicons/core-free-icons';
import type { ColumnInfo } from '@/types';
import { PAGE_SIZE, getPrimaryKey } from './data-grid-utils';
import { DataGridToolbar, DeleteBanner, ErrorBanner } from './data-grid-toolbar';
import { DataGridHeader } from './data-grid-header';
import { DataGridBody } from './data-grid-body';
import { DataGridPagination } from './data-grid-pagination';
import { InsertRowModal } from './data-grid-insert-modal';
import { EditRowModal } from './data-grid-edit-modal';
import { useDataGridMutation, useDataGridMutations } from './data-grid-use-mutation';

interface DataGridProps {
  table: string;
  state: { data: Record<string, unknown>[]; total: number; loading: boolean; error?: string };
  onRefresh: () => void;
  isRealtime: boolean;
  columns?: ColumnInfo[];
}

export function DataGrid({ table, state, onRefresh, isRealtime, columns: colInfos }: DataGridProps) {
  const { getSdk } = useAuth();
  const { databaseId, insertRow, updateRow, deleteRows } = useDatabase();
  const [page, setPage] = useState(1);
  const [selectedIds, setSelectedIds] = useState<Set<unknown>>(new Set());
  const [showInsertModal, setShowInsertModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [editingRow, setEditingRow] = useState<Record<string, unknown> | null>(null);
  const unsubRef = useRef<(() => void) | null>(null);

  const { mutating, setMutating, mutateMsg, showMsg } = useDataGridMutation();
  const totalPages = Math.max(1, Math.ceil((state.total ?? 0) / PAGE_SIZE));
  const primaryKey = getPrimaryKey(colInfos, state.data ?? []);

  const { handleInsert, handleUpdate, handleDelete } = useDataGridMutations({
    table, insertRow, updateRow, deleteRows, onRefresh, showMsg, setMutating,
  });

  // Subscribe to realtime changes
  useEffect(() => {
    if (!isRealtime || !databaseId) return;
    const sdk = getSdk();
    let mounted = true;
    sdk.database(databaseId).from(table).subscribe((event: unknown) => {
      if (!mounted) return;
      const e = event as { eventType: string };
      if (['INSERT', 'UPDATE', 'DELETE'].includes(e.eventType)) onRefresh();
    }).then(sub => { if (mounted) unsubRef.current = () => sub.unsubscribe(); })
      .catch(() => { /* realtime not available */ });
    return () => { mounted = false; unsubRef.current?.(); unsubRef.current = null; };
  }, [isRealtime, databaseId, table, getSdk, onRefresh]);

  useEffect(() => {
    setPage(1);
    setSelectedIds(new Set());
  }, [table, state.data]);

  const columns_ = state.data?.length ? Object.keys(state.data[0]) : [];
  const allSelected = !!state.data?.length && selectedIds.size === state.data.length;

  const handleSelectAll = (checked: boolean) =>
    setSelectedIds(checked ? new Set((state.data ?? []).map(r => r[primaryKey])) : new Set());

  const handleToggleSelect = (id: unknown) =>
    setSelectedIds(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });

  const handleModalInsert = async (row: Record<string, unknown>) => {
    if (await handleInsert(row)) setShowInsertModal(false);
  };

  const handleModalUpdate = async (pkValue: unknown, patch: Record<string, unknown>) => {
    if (await handleUpdate(pkValue, patch)) setEditingRow(null);
  };

  const handleConfirmDelete = async () => {
    if (await handleDelete(Array.from(selectedIds))) {
      setSelectedIds(new Set());
      setShowDeleteConfirm(false);
    }
  };

  return (
    <div className="flex flex-col h-full min-h-0">
      <DataGridToolbar
        table={table}
        total={state.total ?? 0}
        loading={state.loading}
        isRealtime={isRealtime}
        mutateMsg={mutateMsg}
        onInsert={() => setShowInsertModal(true)}
        onRefresh={onRefresh}
      />

      {selectedIds.size > 0 && (
        <DeleteBanner
          count={selectedIds.size}
          onDelete={() => setShowDeleteConfirm(true)}
          onClear={() => setSelectedIds(new Set())}
        />
      )}

      {state.error && <ErrorBanner message={state.error} />}

      <div className="flex-1 overflow-auto min-h-0">
        {state.loading && !state.data?.length ? (
          <div className="flex items-center justify-center h-32 text-xs text-[var(--text-dim)]">Loading rows…</div>
        ) : !state.data?.length ? (
          <div className="flex flex-col items-center justify-center h-32 text-xs text-[var(--text-dim)]">
            <p>Table <code className="text-[var(--text-muted)] font-mono">{table}</code> is empty.</p>
            <button onClick={() => setShowInsertModal(true)} className="mt-2 text-xs text-[var(--accent)] hover:underline">
              Insert the first row <HugeiconsIcon icon={ArrowRight01Icon} size={12} className="inline ml-1" />
            </button>
          </div>
        ) : (
          <table className="w-full text-xs">
            <DataGridHeader columns={columns_} primaryKey={primaryKey} allSelected={allSelected} onSelectAll={handleSelectAll} />
            <DataGridBody columns={columns_} primaryKey={primaryKey} data={state.data} selectedIds={selectedIds} onToggleSelect={handleToggleSelect} onEdit={setEditingRow} />
          </table>
        )}
      </div>

      <DataGridPagination page={page} totalPages={totalPages} total={state.total ?? 0} onPage={setPage} />

      {showInsertModal && (
        <InsertRowModal table={table} columns={colInfos ?? []} onSubmit={handleModalInsert} onClose={() => setShowInsertModal(false)} mutating={mutating} />
      )}

      {editingRow && (
        <EditRowModal table={table} row={editingRow} columns={colInfos ?? []} primaryKey={primaryKey} onSubmit={handleModalUpdate} onClose={() => setEditingRow(null)} mutating={mutating} />
      )}

      {showDeleteConfirm && (
        <ConfirmDialog
          title="Delete Rows"
          message={`Are you sure you want to delete ${selectedIds.size} row(s) from "${table}"? This cannot be undone.`}
          confirmLabel={`Delete ${selectedIds.size} row(s)`}
          variant="danger"
          onConfirm={handleConfirmDelete}
          onClose={() => setShowDeleteConfirm(false)}
        />
      )}
    </div>
  );
}
