'use client';

import { useEffect, useState, useCallback } from 'react';
import { Card, Button, Spinner, EmptyState } from '@fidscript/ui';

import { useAuth } from '@/contexts/auth-context';
import { useToast } from '@/components/toast-provider';
import { InviteMemberModal } from './invite-member-modal';
import { MemberRow, ASSIGNABLE_ROLES } from './member-row';
import type { AssignableRole, Member } from './member-row';
import type { Project } from '@/types';

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
  const [changingRoleId, setChangingRoleId] = useState<string | null>(null);

  const isOwner = project.ownerId === currentUserId;

  const load = useCallback(async () => {
    try {
      const res = await getSdk().projects.listMembers(project.id) as unknown as { members: Array<{ userId: string; email: string; role: string; joinedAt: string }> };
      const list: Member[] = res.members.map(m => ({ id: m.userId, ...m }));
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

  async function handleChangeRole(userId: string, role: AssignableRole) {
    setChangingRoleId(userId);
    try {
      await getSdk().projects.updateMemberRole(project.id, userId, role);
      setMembers(prev => prev.map(m => m.userId === userId ? { ...m, role } : m));
      showToast({ type: 'success', message: `Role updated to ${role}.` });
    } catch (err) {
      showToast({ type: 'error', message: err instanceof Error ? err.message : 'Failed to change role' });
    } finally {
      setChangingRoleId(null);
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
              <MemberRow
                key={member.userId}
                member={member}
                canManage={isOwner && member.role !== 'owner' && currentUserId !== member.userId}
                isChangingRole={changingRoleId === member.userId}
                isRemoving={removingId === member.userId}
                onChangeRole={handleChangeRole}
                onRemove={handleRemove}
              />
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

// Re-export the type so other consumers (e.g. tests) can import from one place.
export type { Member } from './member-row';
export { ASSIGNABLE_ROLES };
