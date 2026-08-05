'use client';

import { HugeiconsIcon } from '@hugeicons/react';
import { RefreshIcon, SaveIcon, Upload03Icon } from '@hugeicons/core-free-icons';
import { Button, Spinner } from '@fidscript/ui';

interface FunctionCodeToolbarProps {
  version: string;
  onVersionChange: (v: string) => void;
  saving: boolean;
  deploying: boolean;
  saveMsg: string | null;
  onReset: () => void;
  onSaveDraft: () => void;
  onDeploy: () => void;
}

export function FunctionCodeToolbar({
  version,
  onVersionChange,
  saving,
  deploying,
  saveMsg,
  onReset,
  onSaveDraft,
  onDeploy,
}: FunctionCodeToolbarProps) {
  return (
    <div className="flex items-center gap-2 px-4 py-2.5 border-b border-[var(--rail)] bg-[var(--surface-2)]/30 flex-wrap flex-shrink-0">
      <input
        type="text"
        value={version}
        onChange={e => onVersionChange(e.target.value)}
        placeholder="Version tag (optional)"
        className="bg-[var(--surface-2)] border border-[var(--rail)] text-[var(--text)] rounded px-2 py-1 text-xs w-40"
      />
      <div className="flex-1" />
      {saveMsg && <span className="text-xs text-emerald-400">{saveMsg}</span>}
      <Button variant="ghost" size="sm" onClick={onReset} className="text-xs">
        <HugeiconsIcon icon={RefreshIcon} size={12} />
        Reset
      </Button>
      <Button variant="outline" size="sm" onClick={onSaveDraft} disabled={saving} className="text-xs">
        <HugeiconsIcon icon={SaveIcon} size={12} />
        Save draft
      </Button>
      <Button variant="primary" size="sm" onClick={onDeploy} disabled={deploying} className="text-xs">
        {deploying ? <Spinner size="sm" /> : <HugeiconsIcon icon={Upload03Icon} size={12} />}
        Deploy
      </Button>
    </div>
  );
}