'use client';

import type { FidscriptSDK } from '@fidscript-deploy/sdk';
import { Button, Modal } from '@fidscript/ui';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { AlertRule, Alert } from '@/types';

interface AlertActionsProps {
  rule: AlertRule;
  projectId: string;
  firingAlert?: Alert;
  getSdk: () => FidscriptSDK;
  onToggle: (updated: AlertRule) => void;
  onAlertUpdated: (alert: Alert) => void;
  onError: (msg: string) => void;
}

export function AlertActions({ rule, projectId, firingAlert, getSdk, onToggle, onAlertUpdated, onError }: AlertActionsProps) {
  const router = useRouter();
  const [toggling, setToggling] = useState(false);
  const [acking, setAcking] = useState(false);
  const [resolving, setResolving] = useState(false);
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

  async function handleAck() {
    if (!firingAlert) return;
    setAcking(true);
    try {
      const updated = await getSdk().monitoring.acknowledgeAlert(projectId, firingAlert.id);
      onAlertUpdated({ ...firingAlert, ...updated, status: 'acknowledged', acknowledgedAt: new Date().toISOString() });
    } catch (err) {
      onError(err instanceof Error ? err.message : 'Failed to acknowledge alert');
    } finally {
      setAcking(false);
    }
  }

  async function handleResolve() {
    if (!firingAlert) return;
    setResolving(true);
    try {
      const updated = await getSdk().monitoring.resolveAlert(projectId, firingAlert.id);
      onAlertUpdated({ ...firingAlert, ...updated, status: 'resolved', resolvedAt: new Date().toISOString() });
    } catch (err) {
      onError(err instanceof Error ? err.message : 'Failed to resolve alert');
    } finally {
      setResolving(false);
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

  const isFiring = firingAlert?.status === 'firing';
  const isAcknowledged = firingAlert?.status === 'acknowledged';

  return (
    <>
      <div className="flex items-center gap-2">
        {isFiring && (
          <Button variant="secondary" size="sm" loading={acking} onClick={handleAck}>
            Acknowledge
          </Button>
        )}
        {(isFiring || isAcknowledged) && (
          <Button variant="primary" size="sm" loading={resolving} onClick={handleResolve}>
            Resolve
          </Button>
        )}
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
