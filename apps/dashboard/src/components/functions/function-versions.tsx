'use client';

import { useCallback, useEffect, useState } from 'react';
import { HugeiconsIcon } from '@hugeicons/react';
import { CheckCircle } from '@hugeicons/core-free-icons';
import { Button, Card, Spinner } from '@fidscript/ui';

import type { FidscriptSDK } from '@fidscript/sdk';

interface FunctionVersionsProps {
  projectId: string;
  functionId: string;
  getSdk: () => FidscriptSDK;
}

interface FunctionVersion {
  version: string;
  createdAt: string;
  status: string;
}

export function FunctionVersions({ projectId, functionId, getSdk }: FunctionVersionsProps) {
  const [versions, setVersions] = useState<FunctionVersion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [leftVer, setLeftVer] = useState<string | null>(null);
  const [rightVer, setRightVer] = useState<string | null>(null);
  const [leftCode, setLeftCode] = useState<string | null>(null);
  const [rightCode, setRightCode] = useState<string | null>(null);
  const [diffLoading, setDiffLoading] = useState(false);

  const loadVersions = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getSdk().functions.listVersions(projectId, functionId);
      setVersions(data as FunctionVersion[]);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load versions');
    } finally {
      setLoading(false);
    }
  }, [projectId, functionId, getSdk]);

  useEffect(() => { loadVersions(); }, [loadVersions]);

  async function loadDiff() {
    if (!leftVer || !rightVer) return;
    setDiffLoading(true);
    try {
      const [left, right] = await Promise.all([
        getSdk().functions.getCode(projectId, functionId, leftVer) as Promise<{ code: string | null }>,
        getSdk().functions.getCode(projectId, functionId, rightVer) as Promise<{ code: string | null }>,
      ]);
      setLeftCode(left.code ?? '// No code');
      setRightCode(right.code ?? '// No code');
    } catch {
      // Silently fail diff load
    } finally {
      setDiffLoading(false);
    }
  }

  function handleLeftChange(v: string) {
    setLeftVer(v);
    if (rightVer && v === rightVer) setRightVer(null);
  }

  function handleRightChange(v: string) {
    setRightVer(v);
    if (leftVer && v === leftVer) setLeftVer(null);
  }

  useEffect(() => {
    if (leftVer && rightVer) {
      loadDiff();
    }
  }, [leftVer, rightVer]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Spinner size="lg" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-[var(--danger)] text-sm mb-3">{error}</p>
        <button onClick={loadVersions} className="text-sm text-[var(--accent)] hover:underline">
          Try again
        </button>
      </div>
    );
  }

  if (versions.length === 0) {
    return (
      <Card className="border border-dashed border-[var(--rail-light)] p-12 text-center">
        <p className="text-sm text-[var(--text-muted)]">No versions deployed yet.</p>
        <p className="text-xs text-[var(--text-dim)] mt-1">Deploy your function to create the first version.</p>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Version list */}
      <Card className="border border-[var(--rail)] overflow-hidden">
        <div className="px-4 py-2.5 border-b border-[var(--rail)] bg-[var(--surface-2)]/30">
          <span className="text-[11px] text-[var(--text-muted)] font-medium uppercase tracking-wide">
            {versions.length} version{versions.length !== 1 ? 's' : ''}
          </span>
        </div>
        <div className="divide-y divide-[var(--rail)]">
          {versions.map((v, i) => (
            <div key={v.version} className="flex items-center gap-4 px-4 py-3 hover:bg-[var(--rail)]/30">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <code className="text-sm font-mono text-[var(--text)]">v{v.version}</code>
                  {i === 0 && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/25">
                      Latest
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-[var(--text-dim)] mt-0.5">
                  {new Date(v.createdAt).toLocaleString()}
                </p>
              </div>
              <span className={`text-[10px] px-2 py-0.5 rounded-full ${
                v.status === 'ACTIVE'
                  ? 'bg-emerald-500/10 text-emerald-400'
                  : v.status === 'FAILED'
                  ? 'bg-rose-500/10 text-rose-400'
                  : 'bg-[var(--rail)] text-[var(--text-muted)]'
              }`}>
                {v.status}
              </span>
            </div>
          ))}
        </div>
      </Card>

      {/* Diff viewer */}
      {versions.length >= 2 && (
        <Card className="border border-[var(--rail)] p-4">
          <h3 className="text-sm font-semibold text-[var(--text)] mb-3">Compare Versions</h3>
          <div className="flex items-center gap-2 mb-3">
            <select
              value={leftVer ?? ''}
              onChange={e => handleLeftChange(e.target.value)}
              className="flex-1 bg-[var(--surface-2)] border border-[var(--rail)] text-[var(--text)] rounded px-2 py-1.5 text-xs"
            >
              <option value="">Select version</option>
              {versions.map(v => (
                <option key={v.version} value={v.version} disabled={v.version === rightVer}>
                  v{v.version}
                </option>
              ))}
            </select>
            <span className="text-[var(--text-dim)] text-xs">vs</span>
            <select
              value={rightVer ?? ''}
              onChange={e => handleRightChange(e.target.value)}
              className="flex-1 bg-[var(--surface-2)] border border-[var(--rail)] text-[var(--text)] rounded px-2 py-1.5 text-xs"
            >
              <option value="">Select version</option>
              {versions.map(v => (
                <option key={v.version} value={v.version} disabled={v.version === leftVer}>
                  v{v.version}
                </option>
              ))}
            </select>
          </div>

          {diffLoading && (
            <div className="flex items-center justify-center py-8">
              <Spinner size="md" />
            </div>
          )}

          {leftCode && rightCode && !diffLoading && (
            <DiffView left={leftCode} right={rightCode} leftLabel={leftVer} rightLabel={rightVer} />
          )}
        </Card>
      )}
    </div>
  );
}

// Simple side-by-side diff view
function DiffView({ left, right, leftLabel, rightLabel }: { left: string; right: string; leftLabel: string | null; rightLabel: string | null }) {
  const leftLines = left.split('\n');
  const rightLines = right.split('\n');
  const maxLines = Math.max(leftLines.length, rightLines.length);

  return (
    <div className="grid grid-cols-2 gap-2 text-xs font-mono overflow-auto max-h-80 rounded border border-[var(--rail)]">
      <div className="overflow-auto">
        <div className="px-2 py-1 bg-[var(--surface-2)] border-b border-[var(--rail)] sticky top-0 text-[var(--text-muted)]">
          v{leftLabel}
        </div>
        {Array.from({ length: maxLines }, (_, i) => {
          const l = leftLines[i];
          const r = rightLines[i];
          const changed = l !== r;
          return (
            <div key={i} className={`px-2 py-0.5 ${changed ? 'bg-rose-500/10 text-rose-400' : 'text-[var(--text-muted)]'}`}>
              {l ?? ''}
            </div>
          );
        })}
      </div>
      <div className="overflow-auto">
        <div className="px-2 py-1 bg-[var(--surface-2)] border-b border-[var(--rail)] sticky top-0 text-[var(--text-muted)]">
          v{rightLabel}
        </div>
        {Array.from({ length: maxLines }, (_, i) => {
          const l = leftLines[i];
          const r = rightLines[i];
          const changed = l !== r;
          return (
            <div key={i} className={`px-2 py-0.5 ${changed ? 'bg-emerald-500/10 text-emerald-400' : 'text-[var(--text-muted)]'}`}>
              {r ?? ''}
            </div>
          );
        })}
      </div>
    </div>
  );
}
