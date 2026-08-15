'use client';

import { useEffect, useState, useCallback } from 'react';
import { Card, Button, Spinner, EmptyState } from '@fidscript/ui';
import { HugeiconsIcon } from '@hugeicons/react';
import { Mail01Icon } from '@hugeicons/core-free-icons';

import { useAuth } from '@/contexts/auth-context';
import { useToast } from '@/components/toast-provider';
import { CreateInvitationModal } from './create-invitation-modal';
import type { Project } from '@/types';

interface Invitation {
  id: string;
  email: string;
  role: string;
  expiresAt: string;
  createdAt: string;
}

interface Props {
  project: Project;
}

export function InvitationsTab({ project }: Props) {
  const { getSdk } = useAuth();
  const { showToast } = useToast();
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [revokingId, setRevokingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const data = await getSdk().projects.listInvitations(project.id);
      setInvitations(Array.isArray(data) ? data : (data as { invitations?: Invitation[] }).invitations ?? []);
    } catch {
      showToast({ type: 'error', message: 'Failed to load invitations' });
    } finally {
      setLoading(false);
    }
  }, [project.id, getSdk, showToast]);

  useEffect(() => { load(); }, [load]);

  async function handleRevoke(invitationId: string) {
    if (!confirm('Revoke this invitation?')) return;
    setRevokingId(invitationId);
    try {
      await getSdk().projects.revokeInvitation(project.id, invitationId);
      setInvitations(prev => prev.filter(i => i.id !== invitationId));
      showToast({ type: 'success', message: 'Invitation revoked.' });
    } catch (err) {
      showToast({ type: 'error', message: err instanceof Error ? err.message : 'Failed to revoke' });
    } finally {
      setRevokingId(null);
    }
  }

  if (loading) return <div className="flex justify-center py-8"><Spinner /></div>;

  const now = Date.now();
  const isExpired = (exp: string) => new Date(exp).getTime() < now;

  return (
    <div className="space-y-4">
      <Card className="border border-[var(--rail)] p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-sm font-semibold text-[var(--text)]">Pending Invitations</h2>
            <p className="text-xs text-[var(--text-muted)] mt-0.5">Invitations sent but not yet accepted. They expire after 7 days.</p>
          </div>
          <Button variant="secondary" size="sm" onClick={() => setShowCreate(true)}>+ New Invitation</Button>
        </div>

        {invitations.length === 0 ? (
          <EmptyState title="No pending invitations" description="Send an invitation to invite someone to this project." />
        ) : (
          <div className="space-y-1.5">
            {invitations.map(inv => {
              const expired = isExpired(inv.expiresAt);
              return (
                <div key={inv.id} className="flex items-center gap-3 px-3 py-2.5 bg-[var(--surface-2)] border border-[var(--rail)] rounded-md">
                  <HugeiconsIcon icon={Mail01Icon} size={14} className="text-[var(--text-muted)] flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-[var(--text)] truncate">{inv.email}</p>
                    <p className="text-[10px] text-[var(--text-dim)]">
                      Sent {new Date(inv.createdAt).toLocaleDateString()}
                      {expired ? ' · Expired' : ` · Expires ${new Date(inv.expiresAt).toLocaleDateString()}`}
                    </p>
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full border capitalize flex-shrink-0 ${
                    expired
                      ? 'bg-[var(--rail)] text-[var(--text-dim)] border-[var(--rail-light)]'
                      : 'bg-blue-900/60 text-[var(--accent)] border-blue-800'
                  }`}>
                    {expired ? 'Expired' : inv.role}
                  </span>
                  {!expired && (
                    <button
                      onClick={() => handleRevoke(inv.id)}
                      disabled={revokingId === inv.id}
                      className="text-xs text-[var(--danger)] hover:text-[var(--danger)] px-1 flex-shrink-0 disabled:opacity-50"
                    >
                      {revokingId === inv.id ? 'Revoking…' : 'Revoke'}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </Card>

      {showCreate && (
        <CreateInvitationModal
          projectId={project.id}
          onCreated={load}
          onClose={() => setShowCreate(false)}
        />
      )}
    </div>
  );
}
