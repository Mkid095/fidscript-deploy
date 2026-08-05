'use client';

import { useCallback, useState } from 'react';

type MutateMsg = { type: 'success' | 'error'; text: string };

export function useDataGridMutation() {
  const [mutating, setMutating] = useState(false);
  const [mutateMsg, setMutateMsg] = useState<MutateMsg | null>(null);

  const showMsg = useCallback((type: 'success' | 'error', text: string) => {
    setMutateMsg({ type, text });
    setTimeout(() => setMutateMsg(null), 3000);
  }, []);

  return { mutating, setMutating, mutateMsg, showMsg };
}

export function useDataGridMutations(opts: {
  table: string;
  insertRow: (table: string, row: Record<string, unknown>) => Promise<{ success: boolean; error?: string }>;
  updateRow: (table: string, pkValue: unknown, patch: Record<string, unknown>) => Promise<{ success: boolean; error?: string }>;
  deleteRows: (table: string, ids: unknown[]) => Promise<{ success: boolean; error?: string }>;
  onRefresh: () => void;
  showMsg: (type: 'success' | 'error', text: string) => void;
  setMutating: (v: boolean) => void;
}) {
  const { table, insertRow, updateRow, deleteRows, onRefresh, showMsg, setMutating } = opts;

  const handleInsert = useCallback(async (row: Record<string, unknown>): Promise<boolean> => {
    setMutating(true);
    const result = await insertRow(table, row);
    setMutating(false);
    if (result.success) {
      showMsg('success', 'Row inserted successfully.');
      onRefresh();
      return true;
    }
    showMsg('error', result.error ?? 'Insert failed.');
    return false;
  }, [table, insertRow, onRefresh, showMsg, setMutating]);

  const handleUpdate = useCallback(async (pkValue: unknown, patch: Record<string, unknown>): Promise<boolean> => {
    setMutating(true);
    const result = await updateRow(table, pkValue, patch);
    setMutating(false);
    if (result.success) {
      showMsg('success', 'Row updated successfully.');
      onRefresh();
      return true;
    }
    showMsg('error', result.error ?? 'Update failed.');
    return false;
  }, [table, updateRow, onRefresh, showMsg, setMutating]);

  const handleDelete = useCallback(async (ids: unknown[]): Promise<boolean> => {
    setMutating(true);
    const result = await deleteRows(table, ids);
    setMutating(false);
    if (result.success) {
      showMsg('success', `${ids.length} row(s) deleted.`);
      onRefresh();
      return true;
    }
    showMsg('error', result.error ?? 'Delete failed.');
    return false;
  }, [table, deleteRows, onRefresh, showMsg, setMutating]);

  return { handleInsert, handleUpdate, handleDelete };
}
