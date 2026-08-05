'use client';

import { useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { HugeiconsIcon } from '@hugeicons/react';
import { Add01Icon, FunctionIcon } from '@hugeicons/core-free-icons';
import { Button, Spinner } from '@fidscript/ui';

import { useAuth } from '@/contexts/auth-context';
import { useShellProjectId } from '@/contexts/project-context';
import { useFunctionsData } from './use-functions-data';
import { FunctionList, CreateFunctionModal } from '@/components/functions';

export default function FunctionsPage() {
  const { getSdk } = useAuth();
  const shellProjectId = useShellProjectId();
  const searchParams = useSearchParams();
  const sdk = getSdk();
  const [showCreate, setShowCreate] = useState(searchParams.get('createFunction') === 'true');

  const projectId = shellProjectId ?? '';
  const { functions, loading, error, loadFunctions, handleCreate, handleDelete } =
    useFunctionsData(sdk, projectId);

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-violet-500/10 border border-violet-500/20 flex items-center justify-center">
            <HugeiconsIcon icon={FunctionIcon} size={20} className="text-violet-300" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-[var(--text)]">Functions</h1>
            <p className="text-xs text-[var(--text-muted)]">
              {functions.length} function{functions.length !== 1 ? 's' : ''}
            </p>
          </div>
        </div>
        <Button
          variant="primary"
          size="sm"
          onClick={() => setShowCreate(true)}
          disabled={!projectId}
          className="flex items-center gap-1.5"
        >
          <HugeiconsIcon icon={Add01Icon} size={14} />
          Create Function
        </Button>
      </div>

      {/* List */}
      {loading && !functions.length ? (
        <div className="flex items-center justify-center min-h-48">
          <Spinner size="lg" />
        </div>
      ) : (
        <FunctionList
          functions={functions}
          projectId={projectId}
          loading={false}
          error={error}
          onRefresh={loadFunctions}
          onDelete={handleDelete}
        />
      )}

      {/* Create modal */}
      <CreateFunctionModal
        isOpen={showCreate}
        onClose={() => setShowCreate(false)}
        onCreated={() => loadFunctions()}
        onCreate={handleCreate}
      />
    </div>
  );
}
