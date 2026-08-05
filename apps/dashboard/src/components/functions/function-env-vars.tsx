'use client';

import { HugeiconsIcon } from '@hugeicons/react';
import { Add01Icon, CancelCircleIcon } from '@hugeicons/core-free-icons';
import { Button, Card, Input } from '@fidscript/ui';

interface FunctionEnvVarsProps {
  envVars: Record<string, string>;
  newKey: string;
  newVal: string;
  saving: boolean;
  hasChanges: boolean;
  onNewKeyChange: (v: string) => void;
  onNewValChange: (v: string) => void;
  onAdd: () => void;
  onRemove: (key: string) => void;
  onSave: () => Promise<void>;
}

export function FunctionEnvVars({
  envVars, newKey, newVal, saving, hasChanges,
  onNewKeyChange, onNewValChange, onAdd, onRemove, onSave,
}: FunctionEnvVarsProps) {
  return (
    <Card className="border border-[var(--rail)] p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-[var(--text)]">Environment Variables</h3>
        {hasChanges && (
          <Button variant="primary" size="sm" onClick={onSave} loading={saving}>
            {saving ? 'Saving…' : 'Save changes'}
          </Button>
        )}
      </div>

      {Object.entries(envVars).length > 0 && (
        <div className="space-y-2 mb-4">
          {Object.entries(envVars).map(([key, value]) => (
            <div key={key} className="flex items-center gap-2 group">
              <code className="flex-1 text-xs bg-[var(--surface-2)] border border-[var(--rail)] rounded px-2 py-1.5 font-mono text-[var(--text)] truncate">
                {key}
              </code>
              <code className="flex-1 text-xs bg-[var(--surface-2)] border border-[var(--rail)] rounded px-2 py-1.5 font-mono text-[var(--text-muted)] truncate">
                {value}
              </code>
              <button
                onClick={() => onRemove(key)}
                className="opacity-0 group-hover:opacity-100 transition-opacity text-[var(--text-dim)] hover:text-rose-400 p-1"
              >
                <HugeiconsIcon icon={CancelCircleIcon} size={12} />
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="flex items-end gap-2">
        <div className="flex-1">
          <label className="block text-[10px] text-[var(--text-muted)] mb-1">Key</label>
          <Input value={newKey} onChange={e => onNewKeyChange(e.target.value)} placeholder="API_KEY" className="text-xs" />
        </div>
        <div className="flex-1">
          <label className="block text-[10px] text-[var(--text-muted)] mb-1">Value</label>
          <Input value={newVal} onChange={e => onNewValChange(e.target.value)} placeholder="secret-value" className="text-xs" />
        </div>
        <Button variant="outline" size="sm" onClick={onAdd} className="mb-0.5">
          <HugeiconsIcon icon={Add01Icon} size={13} />
        </Button>
      </div>
    </Card>
  );
}
