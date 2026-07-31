'use client';

import Link from 'next/link';
import { useState } from 'react';
import { HugeiconsIcon } from '@hugeicons/react';
import { Delete01Icon } from '@hugeicons/core-free-icons';
import { Button, Spinner } from '@fidscript/ui';

import { FunctionStatusBadge } from './function-status-badge';
import { ConfirmDialog } from '@/components/deployments/confirm-dialog';
import type { Function_ } from '@/types';

interface FunctionCardProps {
  fn: Function_;
  projectId: string;
  onDeleted: (id: string) => void;
  onDelete: (fn: Function_) => Promise<void>;
}

const RUNTIME_LABELS: Record<string, string> = {
  node: 'Node.js',
  python: 'Python',
  go: 'Go',
  rust: 'Rust',
};

export function FunctionCard({ fn, projectId, onDeleted, onDelete }: FunctionCardProps) {
  const [showDelete, setShowDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  async function handleDelete() {
    setDeleting(true);
    try {
      await onDelete(fn);
      onDeleted(fn.id);
    } finally {
      setDeleting(false);
      setShowDelete(false);
    }
  }

  return (
    <>
      <div className="flex items-center gap-4 px-4 py-3 hover:bg-[var(--rail)]/30 transition-colors group">
        {/* Name + runtime */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <Link
              href={`/projects/${projectId}/functions/${fn.id}`}
              className="text-sm font-medium text-[var(--text)] hover:text-[var(--accent)] truncate"
            >
              {fn.name}
            </Link>
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-[var(--surface-2)] text-[var(--text-muted)] border border-[var(--rail)]">
              {RUNTIME_LABELS[fn.runtime] ?? fn.runtime}
            </span>
          </div>
          <p className="text-[11px] text-[var(--text-dim)] mt-0.5">
            Created {new Date(fn.createdAt).toLocaleDateString()}
          </p>
        </div>

        {/* Status */}
        <FunctionStatusBadge status={fn.status} />

        {/* Actions */}
        <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <Link
            href={`/projects/${projectId}/functions/${fn.id}`}
            className="text-xs text-[var(--text-muted)] hover:text-[var(--text)] px-2 py-1"
          >
            View
          </Link>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowDelete(true)}
            className="text-[var(--text-dim)] hover:text-rose-400"
          >
            {deleting ? <Spinner size="sm" /> : <HugeiconsIcon icon={Delete01Icon} size={14} />}
          </Button>
        </div>
      </div>

      {showDelete && (
        <ConfirmDialog
          title="Delete Function"
          message={`Are you sure you want to delete "${fn.name}"? This action cannot be undone.`}
          confirmLabel="Delete"
          variant="danger"
          onConfirm={handleDelete}
          onClose={() => setShowDelete(false)}
        />
      )}
    </>
  );
}
