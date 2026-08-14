'use client';

import { useEffect, useState, useCallback } from 'react';
import { Card, Button, Spinner, EmptyState } from '@fidscript/ui';
import { HugeiconsIcon } from '@hugeicons/react';
import { UserGroupIcon } from '@hugeicons/core-free-icons';

import { useAuth } from '@/contexts/auth-context';
import { useToast } from '@/components/toast-provider';
import { InviteMemberModal } from './invite-member-modal';
import type { Project } from '@/types';

interface Member {
  id: string;
  userId: string;
  email: string;
  role: string;
  joinedAt: string;
}

const ROLE_COLORS: Record<string, string> = {
  owner: 'bg-amber-900/60 text-[var(--warning)] border-[var(--warning)]/30',
  admin: 'bg-blue-900/60 text-[var(--accent)] border-blue-800',
  developer: 'bg-green-900/60 text-green-400 border-green-800',
  viewer: 'bg-[var(--rail)] text-[var(--text-muted)] border-[var(--rail-light)]',
};

interface Props {
  project: Project;
  currentUserId?: string;
}

export function MembersTab({ project, currentUserId }: Props) {
  const { getSdk } = useAuth();
  const { showToast } = useToast();
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [showInvite, setShowInvite] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);

  const isOwner = project.ownerId === currentUserId;

  const load = useCallback(async () => {
    try {
      const data = await getSdk().projects.listMembers(project.id);
      const list = Array.isArray(data) ? data : (data as { members?: Member[] }).members ?? [];
      setMembers(list);
    } catch {
      showToast({ type: 'error', message: 'Failed to load members' });
    } finally {
      setLoading(false);
    }
  }, [project.id, getSdk, showToast]);

  useEffect(() => { load(); }, [load]);

  async function handleRemove(userId: string) {
    if (!confirm('Remove this member from the project?')) return;
    setRemovingId(userId);
    try {
      await getSdk().projects.removeMember(project.id, userId);
      setMembers(prev => prev.filter(m => m.userId !== userId));
      showToast({ type: 'success', message: 'Member removed.' });
    } catch (err) {
      showToast({ type: 'error', message: err instanceof Error ? err.message : 'Failed to remove member' });
    } finally {
      setRemovingId(null);
    }
  }

  if (loading) return <div className="flex justify-center py-8"><Spinner /></div>;

  return (
    <div className="space-y-4">
      <Card className="border border-[var(--rail)] p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-sm font-semibold text-[var(--text)]">Project Members</h2>
            <p className="text-xs text-[var(--text-muted)] mt-0.5">Manage who has access to this project.</p>
          </div>
          {isOwner && (
            <Button variant="secondary" size="sm" onClick={() => setShowInvite(true)}>+ Invite</Button>
          )}
        </div>

        {members.length === 0 ? (
          <EmptyState title="No members" description="Invite team members to collaborate on this project." />
        ) : (
          <div className="space-y-1.5">
            {members.map(member => (
              <div key={member.userId} className="flex items-center gap-3 px-3 py-2.5 bg-[var(--surface-2)] border border-[var(--rail)] rounded-md">
                <HugeiconsIcon icon={UserGroupIcon} size={14} className="text-[var(--text-muted)] flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-[var(--text)] truncate">{member.email}</p>
                  <p className="text-[10px] text-[var(--text-dim)]">Joined {new Date(member.joinedAt).toLocaleDateString()}</p>
                </div>
                <span className={`text-xs px-2 py-0.5 rounded-full border capitalize flex-shrink-0 ${ROLE_COLORS[member.role] ?? ROLE_COLORS.viewer}`}>
                  {member.role}
                </span>
                {isOwner && member.role !== 'owner' && currentUserId !== member.userId && (
                  <button
                    onClick={() => handleRemove(member.userId)}
                    disabled={removingId === member.userId}
                    className="text-xs text-[var(--danger)] hover:text-[var(--danger)] px-1 flex-shrink-0 disabled:opacity-50"
                  >
                    {removingId === member.userId ? 'Removing…' : 'Remove'}
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </Card>

      {showInvite && (
        <InviteMemberModal
          projectId={project.id}
          onInvited={load}
          onClose={() => setShowInvite(false)}
        />
      )}
    </div>
  );
}
