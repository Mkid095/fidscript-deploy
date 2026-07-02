'use client';

import { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { HugeiconsIcon } from '@hugeicons/react';
import { Add01Icon, FunctionIcon } from '@hugeicons/core-free-icons';
import { Button, Spinner } from '@fidscript/ui';

import { useAuth } from '@/contexts/auth-context';
import { useShellProjectId } from '@/contexts/project-context';
import { FunctionList, CreateFunctionModal } from '@/components/functions';
import type { Function_ } from '@/types';

export default function FunctionsPage() {
  const { getSdk } = useAuth();
  const shellProjectId = useShellProjectId();
  const searchParams = useSearchParams();
  const [projectId, setProjectId] = useState(shellProjectId ?? '');
  const [functions, setFunctions] = useState<Function_[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(searchParams.get('createFunction') === 'true');

  const loadFunctions = useCallback(async () => {
    if (!projectId) return;
    setLoading(true);
    try {
      const sdk = getSdk();
      const data = await sdk.functions.list(projectId);
      setFunctions(data as Function_[]);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load functions');
    } finally {
      setLoading(false);
    }
  }, [projectId, getSdk]);

  useEffect(() => { loadFunctions(); }, [loadFunctions]);

  // Realtime subscription for function events
  useEffect(() => {
    if (!projectId) return;
    const sdk = getSdk();
    const rt = (sdk as any).realtime;
    if (!rt) return;

    const token = localStorage.getItem('fidscript_access_token')
      ?? localStorage.getItem('fidscript_token') ?? '';

    let cancelled = false;

    rt.connect(() => token, projectId).then(() => {
      if (cancelled) return;
      const unsub = rt.subscribeFunctions(projectId, (event: any) => {
        const et = event?.type;
        if (!et) return;
        if (et === 'function.created' || et === 'function.deleted') {
          loadFunctions();
        }
      });
      if (cancelled) unsub();
    });

    return () => { cancelled = true; };
  }, [projectId, getSdk, loadFunctions]);

  async function handleCreate(data: { name: string; runtime: string }) {
    const sdk = getSdk();
    const created = await sdk.functions.create(projectId, data) as Function_;
    setFunctions(prev => [...prev, created]);
    return created;
  }

  async function handleDelete(fn: Function_) {
    const sdk = getSdk();
    await sdk.functions.delete(projectId, fn.id);
  }

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
