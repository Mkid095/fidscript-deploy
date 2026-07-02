'use client';

import { useCallback } from 'react';
import Link from 'next/link';
import { Card, EmptyState, Button, Spinner } from '@fidscript/ui';
import { HugeiconsIcon } from '@hugeicons/react';
import { Add01Icon } from '@hugeicons/core-free-icons';

import { FunctionCard } from './function-card';
import type { Function_ } from '@/types';

interface FunctionListProps {
  functions: Function_[];
  projectId: string;
  loading: boolean;
  error: string | null;
  onRefresh: () => void;
  onDelete: (fn: Function_) => Promise<void>;
}

export function FunctionList({ functions, projectId, loading, error, onRefresh, onDelete }: FunctionListProps) {
  const handleDeleted = useCallback((_id: string) => {
    onRefresh();
  }, [onRefresh]);

  if (loading) {
    return (
      <Card className="border border-[var(--rail)] p-8 flex justify-center">
        <Spinner size="lg" />
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="border border-[var(--rail)] p-8 text-center">
        <p className="text-[var(--danger)] text-sm mb-3">{error}</p>
        <Button variant="ghost" size="sm" onClick={onRefresh}>Try again</Button>
      </Card>
    );
  }

  if (functions.length === 0) {
    return (
      <Card className="border border-dashed border-[var(--rail-light)] p-12 text-center">
        <EmptyState
          title="No functions yet"
          description="Create your first serverless function to get started."
          action={
            <Link href={`?createFunction=true`}>
              <Button variant="primary" size="sm" className="flex items-center gap-1.5 mx-auto">
                <HugeiconsIcon icon={Add01Icon} size={14} />
                Create Function
              </Button>
            </Link>
          }
        />
      </Card>
    );
  }

  return (
    <Card className="border border-[var(--rail)] overflow-hidden">
      {/* Header row */}
      <div className="flex items-center gap-4 px-4 py-2.5 border-b border-[var(--rail)] bg-[var(--surface-2)]/30">
        <span className="flex-1 text-[11px] text-[var(--text-muted)] font-medium uppercase tracking-wide">Name</span>
        <span className="text-[11px] text-[var(--text-muted)] font-medium uppercase tracking-wide w-24 text-center">Status</span>
        <span className="text-[11px] text-[var(--text-muted)] font-medium uppercase tracking-wide w-20 text-right">Actions</span>
      </div>

      {/* Function rows */}
      <div className="divide-y divide-[var(--rail)]">
        {functions.map(fn => (
          <FunctionCard
            key={fn.id}
            fn={fn}
            projectId={projectId}
            onDeleted={handleDeleted}
            onDelete={onDelete}
          />
        ))}
      </div>
    </Card>
  );
}
