import type { FidscriptSDK } from '@fidscript-deploy/sdk';
'use client';

import { Button, Modal } from '@fidscript/ui';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { AlertRule, NotificationChannel } from '@/types';

interface AlertActionsProps {
  rule: AlertRule;
  projectId: string;
  getSdk: () => FidscriptSDK;
  onToggle: (updated: AlertRule) => void;
  onError: (msg: string) => void;
}

export function AlertActions({ rule, projectId, getSdk, onToggle, onError }: AlertActionsProps) {
  const router = useRouter();
  const [toggling, setToggling] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  async function handleToggle() {
    setToggling(true);
    try {
      const updated = await getSdk().monitoring.updateAlertRule(projectId, rule.id, { enabled: !rule.enabled });
      onToggle(updated);
    } catch (err) {
      onError(err instanceof Error ? err.message : 'Failed to update');
    } finally {
      setToggling(false);
    }
  }

  async function handleDelete() {
    setDeleting(true);
    try {
      await getSdk().monitoring.deleteAlertRule(projectId, rule.id);
      router.push(`/monitoring?project=${projectId}`);
    } catch (err) {
      onError(err instanceof Error ? err.message : 'Failed to delete rule');
      setDeleting(false);
    }
  }

  return (
    <>
      <div className="flex items-center gap-2">
        <Button
          variant={rule.enabled ? 'secondary' : 'primary'}
          size="sm"
          loading={toggling}
          onClick={handleToggle}
        >
          {rule.enabled ? 'Pause' : 'Resume'}
        </Button>
        <Button variant="danger" size="sm" onClick={() => setShowDelete(true)}>
          Delete
        </Button>
      </div>

      <Modal isOpen={showDelete} onClose={() => setShowDelete(false)} title="Delete Alert Rule" size="sm">
        <div className="space-y-4">
          <p className="text-sm text-[var(--text-muted)]">
            Are you sure you want to delete <span className="text-[var(--text)] font-medium">{rule.name}</span>? This cannot be undone.
          </p>
          <div className="flex justify-end gap-3">
            <Button variant="ghost" size="sm" onClick={() => setShowDelete(false)}>Cancel</Button>
            <Button variant="danger" size="sm" loading={deleting} onClick={handleDelete}>Delete</Button>
          </div>
        </div>
      </Modal>
    </>
  );
}
