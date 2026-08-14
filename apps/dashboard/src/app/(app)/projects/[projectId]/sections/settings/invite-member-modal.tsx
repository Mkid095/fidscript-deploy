'use client';

import { useState } from 'react';
import { Button, Input, Modal } from '@fidscript/ui';

import { useAuth } from '@/contexts/auth-context';
import { useToast } from '@/components/toast-provider';

interface InviteMemberModalProps {
  projectId: string;
  onInvited: () => void;
  onClose: () => void;
}

export function InviteMemberModal({ projectId, onInvited, onClose }: InviteMemberModalProps) {
  const { getSdk } = useAuth();
  const { showToast } = useToast();
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<'admin' | 'developer' | 'viewer'>('developer');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;
    setLoading(true);
    try {
      await getSdk().projects.invite(projectId, email.trim(), role);
      showToast({ type: 'success', message: `Invitation sent to ${email}` });
      onInvited();
      onClose();
    } catch (err) {
      showToast({ type: 'error', message: err instanceof Error ? err.message : 'Failed to send invitation' });
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal isOpen onClose={onClose} title="Invite Member" size="sm">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs text-[var(--text-muted)] mb-1">Email</label>
          <Input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="colleague@example.com"
            className="bg-[var(--surface-2)] border border-[var(--rail)] text-[var(--text)]"
            autoFocus
          />
        </div>
        <div>
          <label className="block text-xs text-[var(--text-muted)] mb-1">Role</label>
          <select
            value={role}
            onChange={e => setRole(e.target.value as 'admin' | 'developer' | 'viewer')}
            className="w-full bg-[var(--surface-2)] border border-[var(--rail)] text-[var(--text)] rounded-lg px-3 py-2 text-sm"
          >
            <option value="admin">Admin — full access to settings</option>
            <option value="developer">Developer — deploy, manage services</option>
            <option value="viewer">Viewer — read-only access</option>
          </select>
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="ghost" size="sm" type="button" onClick={onClose}>Cancel</Button>
          <Button variant="primary" size="sm" type="submit" loading={loading}>Send Invite</Button>
        </div>
      </form>
    </Modal>
  );
}
