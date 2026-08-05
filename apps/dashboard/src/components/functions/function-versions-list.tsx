'use client';

import { useCallback, useEffect, useState } from 'react';
import { Card, Spinner } from '@fidscript/ui';

import { FunctionVersionRow } from './function-version-row';
import { DiffView } from './function-versions-diff-view';
import type { FidscriptSDK } from '@fidscript-deploy/sdk';

interface FunctionVersion {
  version: string;
  createdAt: string;
  status: string;
}

interface FunctionVersionsListProps {
  projectId: string;
  functionId: string;
  versions: FunctionVersion[];
  getSdk: () => FidscriptSDK;
}

export function FunctionVersionsList({
  projectId,
  functionId,
  versions,
  getSdk,
}: FunctionVersionsListProps) {
  const [leftVer, setLeftVer] = useState<string | null>(null);
  const [rightVer, setRightVer] = useState<string | null>(null);
  const [leftCode, setLeftCode] = useState<string | null>(null);
  const [rightCode, setRightCode] = useState<string | null>(null);
  const [diffLoading, setDiffLoading] = useState(false);

  const loadDiff = useCallback(async () => {
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
  }, [leftVer, rightVer, projectId, functionId, getSdk]);

  useEffect(() => {
    if (leftVer && rightVer) loadDiff();
  }, [leftVer, rightVer, loadDiff]);

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
            <FunctionVersionRow
              key={v.version}
              version={v.version}
              createdAt={v.createdAt}
              status={v.status}
              isLatest={i === 0}
            />
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
              onChange={e => {
                const v = e.target.value;
                setLeftVer(v);
                if (rightVer && v === rightVer) setRightVer(null);
              }}
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
              onChange={e => {
                const v = e.target.value;
                setRightVer(v);
                if (leftVer && v === leftVer) setLeftVer(null);
              }}
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

