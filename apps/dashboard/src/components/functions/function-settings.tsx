'use client';

import { useState } from 'react';
import { HugeiconsIcon } from '@hugeicons/react';
import { Delete01Icon, Add01Icon, CancelCircleIcon } from '@hugeicons/core-free-icons';
import { Button, Card, Input, Spinner } from '@fidscript/ui';

import { FunctionStatusBadge } from './function-status-badge';
import { ConfirmDialog } from '@/components/deployments/confirm-dialog';
import type { Function_ } from '@/types';

interface FunctionSettingsProps {
  fn: Function_;
  onUpdate: (data: Partial<Function_>) => Promise<void>;
  onDelete: () => void;
}

const RUNTIME_LABELS: Record<string, string> = {
  node: 'Node.js', python: 'Python', go: 'Go', rust: 'Rust',
};

export function FunctionSettings({ fn, onUpdate, onDelete }: FunctionSettingsProps) {
  const [envVars, setEnvVars] = useState<Record<string, string>>({ ...fn.envVars });
  const [newKey, setNewKey] = useState('');
  const [newVal, setNewVal] = useState('');
  const [saving, setSaving] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  async function handleSaveEnvVars() {
    setSaving(true);
    try {
      await onUpdate({ envVars });
    } finally {
      setSaving(false);
    }
  }

  function addEnvVar() {
    if (!newKey.trim()) return;
    setEnvVars(prev => ({ ...prev, [newKey.trim()]: newVal }));
    setNewKey('');
    setNewVal('');
  }

  function removeEnvVar(key: string) {
    setEnvVars(prev => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
  }

  async function handleDelete() {
    setDeleting(true);
    try {
      onDelete();
    } finally {
      setDeleting(false);
      setShowDelete(false);
    }
  }

  const hasChanges = JSON.stringify(envVars) !== JSON.stringify(fn.envVars);

  return (
    <div className="space-y-6">
      {/* Info grid */}
      <Card className="border border-[var(--rail)] p-4">
        <h3 className="text-sm font-semibold text-[var(--text)] mb-3">Function Info</h3>
        <dl className="grid grid-cols-2 gap-3 text-sm">
          {[
            ['Name', fn.name],
            ['Runtime', RUNTIME_LABELS[fn.runtime] ?? fn.runtime],
            ['Status', ''],
            ['Version', fn.currentVersion ?? '—'],
            ['Memory', fn.memoryMb ? `${fn.memoryMb} MB` : '—'],
            ['Timeout', fn.timeoutSeconds ? `${fn.timeoutSeconds}s` : '—'],
            ['Entry Point', fn.entryPoint ?? '—'],
            ['Created', new Date(fn.createdAt).toLocaleDateString()],
          ].map(([label, value]) => (
            <div key={label} className="flex flex-col gap-0.5">
              <dt className="text-[11px] text-[var(--text-muted)] uppercase tracking-wide">{label}</dt>
              <dd className="text-[var(--text)]">
                {label === 'Status' ? (
                  <FunctionStatusBadge status={fn.status} />
                ) : (
                  value || <span className="text-[var(--text-dim)]">—</span>
                )}
              </dd>
            </div>
          ))}
        </dl>
      </Card>

      {/* Environment variables */}
      <Card className="border border-[var(--rail)] p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-[var(--text)]">Environment Variables</h3>
          {hasChanges && (
            <Button
              variant="primary"
              size="sm"
              onClick={handleSaveEnvVars}
              loading={saving}
            >
              {saving ? 'Saving…' : 'Save changes'}
            </Button>
          )}
        </div>

        {/* Existing vars */}
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
                  onClick={() => removeEnvVar(key)}
                  className="opacity-0 group-hover:opacity-100 transition-opacity text-[var(--text-dim)] hover:text-rose-400 p-1"
                >
                  <HugeiconsIcon icon={CancelCircleIcon} size={12} />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Add new var */}
        <div className="flex items-end gap-2">
          <div className="flex-1">
            <label className="block text-[10px] text-[var(--text-muted)] mb-1">Key</label>
            <Input
              value={newKey}
              onChange={e => setNewKey(e.target.value)}
              placeholder="API_KEY"
              className="text-xs"
            />
          </div>
          <div className="flex-1">
            <label className="block text-[10px] text-[var(--text-muted)] mb-1">Value</label>
            <Input
              value={newVal}
              onChange={e => setNewVal(e.target.value)}
              placeholder="secret-value"
              className="text-xs"
            />
          </div>
          <Button variant="outline" size="sm" onClick={addEnvVar} className="mb-0.5">
            <HugeiconsIcon icon={Add01Icon} size={13} />
          </Button>
        </div>
      </Card>

      {/* Danger zone */}
      <Card className="border border-rose-500/20 p-4">
        <h3 className="text-sm font-semibold text-rose-400 mb-2">Danger Zone</h3>
        <p className="text-xs text-[var(--text-muted)] mb-3">
          Permanently delete this function and all its versions.
        </p>
        <Button variant="danger" size="sm" onClick={() => setShowDelete(true)}>
          <HugeiconsIcon icon={Delete01Icon} size={13} />
          Delete Function
        </Button>
      </Card>

      {showDelete && (
        <ConfirmDialog
          title="Delete Function"
          message={`Delete "${fn.name}" permanently? This cannot be undone.`}
          confirmLabel="Delete"
          variant="danger"
          onConfirm={handleDelete}
          onClose={() => setShowDelete(false)}
        />
      )}
    </div>
  );
}
