'use client';

import { useEffect, useState } from 'react';
import { Button, Spinner } from '@fidscript/ui';

import { useAuth } from '@/contexts/auth-context';
import { relativeTime } from './status-utils';
import type { Deployment } from '@/types';

interface RollbackPickerProps {
  projectId: string;
  currentId: string;
  onPicked: (targetId: string) => void;
  onClose: () => void;
}

export function RollbackPicker({ projectId, currentId, onPicked, onClose }: RollbackPickerProps) {
  const { getSdk } = useAuth();
  const [deployments, setDeployments] = useState<Deployment[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getSdk().deployments.list(projectId, { limit: 50 })
      .then(data => {
        const all: Deployment[] = (data as any).deployments ?? data ?? [];
        setDeployments(all.filter((d: Deployment) => d.status === 'SUCCESS' && d.id !== currentId));
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [projectId, currentId, getSdk]);

  async function handleRollback() {
    if (!selected) return;
    setSubmitting(true);
    setError(null);
    try {
      const sdk = getSdk();
      await sdk.deployments.rollback(projectId, currentId, selected);
      onPicked(selected);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Rollback failed');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <p className="text-sm text-[var(--text-muted)] mb-1">Select a deployment to roll back to</p>
        <p className="text-xs text-[var(--text-dim)]">A new deployment will be created using the image from the selected release.</p>
      </div>

      {loading ? (
        <div className="flex justify-center py-6"><Spinner size="md" /></div>
      ) : deployments.length === 0 ? (
        <p className="text-xs text-[var(--text-muted)] py-4 text-center">No prior successful deployments found.</p>
      ) : (
        <DeploymentList deployments={deployments.slice(0, 10)} selected={selected} onSelect={setSelected} />
      )}

      {error && <p className="text-xs text-[var(--danger)]">{error}</p>}

      <div className="flex flex-col-reverse sm:flex-row justify-end gap-2 pt-2 border-t border-[var(--rail)]">
        <Button variant="ghost" size="sm" onClick={onClose}>Cancel</Button>
        <Button
          variant="primary"
          size="sm"
          disabled={!selected || submitting}
          loading={submitting}
          onClick={handleRollback}
        >
          Roll back
        </Button>
      </div>
    </div>
  );
}

function DeploymentList({
  deployments,
  selected,
  onSelect,
}: {
  deployments: Deployment[];
  selected: string | null;
  onSelect: (id: string) => void;
}) {
  return (
    <div className="flex flex-col gap-2 max-h-60 overflow-y-auto">
      {deployments.map(d => (
        <button
          key={d.id}
          onClick={() => onSelect(d.id)}
          className={`flex items-start gap-3 p-3.5 rounded-lg border text-left transition-all ${
            selected === d.id
              ? 'border-[var(--accent)]/40 bg-[var(--accent)]/5'
              : 'border-[var(--rail)] hover:border-[var(--rail-light)] bg-[var(--surface-2)]'
          }`}
        >
          <div className={`w-3 h-3 rounded-full mt-1 flex-shrink-0 ${selected === d.id ? 'bg-[var(--accent)]' : 'bg-[var(--rail)]'}`} />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-mono text-[var(--text-muted)]">{d.commitSha?.slice(0, 7) ?? d.id.slice(0, 8)}</span>
              {d.branch && <span className="text-xs text-[var(--text-dim)]">· {d.branch}</span>}
              <span className="text-[10px] text-[var(--text-dim)] ml-auto">{relativeTime(d.createdAt)}</span>
            </div>
            {d.imageTag && <p className="text-[10px] font-mono text-[var(--text-dim)] mt-0.5">{d.imageTag}</p>}
          </div>
        </button>
      ))}
    </div>
  );
}
