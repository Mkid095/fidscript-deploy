'use client';

import { useState } from 'react';
import { Card, Button, Input, Modal } from '@fidscript/ui';

import { useAuth } from '@/contexts/auth-context';
import { useToast } from '@/components/toast-provider';
import type { Project } from '@/types';

export function DangerTab({ project }: { project: Project }) {
  const { getSdk } = useAuth();
  const { showToast } = useToast();
  const [showDelete, setShowDelete] = useState(false);
  const [confirmText, setConfirmText] = useState('');
  const [deleting, setDeleting] = useState(false);

  async function handleDelete() {
    if (confirmText !== project.name) return;
    setDeleting(true);
    try {
      await getSdk().projects.delete(project.id);
      window.location.href = '/projects';
    } catch (err) {
      showToast({ type: 'error', message: err instanceof Error ? err.message : 'Failed to delete project' });
      setDeleting(false);
    }
  }

  return (
    <>
      <Card className="border border-[var(--danger)]/30 p-5">
        <h2 className="text-sm font-semibold text-[var(--danger)] mb-3">Danger Zone</h2>
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-[var(--text)]">Delete this project</p>
            <p className="text-xs text-[var(--text-muted)] mt-0.5">Permanently deletes the project, all deployments, env vars, and API keys. This cannot be undone.</p>
          </div>
          <Button variant="danger" size="sm" onClick={() => setShowDelete(true)}>Delete</Button>
        </div>
      </Card>

      <Modal isOpen={showDelete} onClose={() => setShowDelete(false)} title="Delete Project" size="sm">
        <div className="space-y-4">
          <p className="text-sm text-[var(--text-muted)]">Type <span className="font-mono text-[var(--text)]">{project.name}</span> to confirm deletion.</p>
          <Input value={confirmText} onChange={e => setConfirmText(e.target.value)} placeholder={project.name} className="bg-[var(--surface-2)] border border-[var(--rail)] text-[var(--text)]" />
          <div className="flex justify-end gap-2">
            <Button variant="ghost" size="sm" onClick={() => setShowDelete(false)}>Cancel</Button>
            <Button variant="danger" size="sm" loading={deleting} disabled={confirmText !== project.name} onClick={handleDelete}>Delete project</Button>
          </div>
        </div>
      </Modal>
    </>
  );
}
