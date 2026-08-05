'use client';

import { Button, Card } from '@fidscript/ui';
import { HugeiconsIcon } from '@hugeicons/react';
import { Delete01Icon } from '@hugeicons/core-free-icons';
import { FunctionStatusBadge } from './function-status-badge';
import { ConfirmDialog } from '@/components/deployments/confirm-dialog';
import { FunctionEnvVars } from './function-env-vars';
import { useFunctionSettings } from './function-settings-hooks';
import { RUNTIME_LABELS } from './function-settings-types';
import type { FunctionSettingsProps } from './function-settings-types';

export function FunctionSettings({ fn, onUpdate, onDelete }: FunctionSettingsProps) {
  const {
    envVars, newKey, newVal, saving, showDelete, deleting, hasChanges,
    setNewKey, setNewVal, setShowDelete,
    addEnvVar, removeEnvVar, handleSaveEnvVars, handleDelete,
  } = useFunctionSettings({ fn, onUpdate, onDelete });

  return (
    <div className="space-y-6">
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

      <FunctionEnvVars
        envVars={envVars}
        newKey={newKey}
        newVal={newVal}
        saving={saving}
        hasChanges={hasChanges}
        onNewKeyChange={setNewKey}
        onNewValChange={setNewVal}
        onAdd={addEnvVar}
        onRemove={removeEnvVar}
        onSave={handleSaveEnvVars}
      />

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
