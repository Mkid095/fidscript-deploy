'use client';

import { HugeiconsIcon } from '@hugeicons/react';
import { UserGroupIcon } from '@hugeicons/core-free-icons';

export interface Member {
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

export const ASSIGNABLE_ROLES = ['admin', 'developer', 'viewer'] as const;
export type AssignableRole = (typeof ASSIGNABLE_ROLES)[number];

interface MemberRowProps {
  member: Member;
  canManage: boolean;
  isChangingRole: boolean;
  isRemoving: boolean;
  onChangeRole: (userId: string, role: AssignableRole) => void;
  onRemove: (userId: string) => void;
}

export function MemberRow({
  member, canManage, isChangingRole, isRemoving, onChangeRole, onRemove,
}: MemberRowProps) {
  return (
    <div className="flex items-center gap-3 px-3 py-2.5 bg-[var(--surface-2)] border border-[var(--rail)] rounded-md">
      <HugeiconsIcon icon={UserGroupIcon} size={14} className="text-[var(--text-muted)] flex-shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-sm text-[var(--text)] truncate">{member.email}</p>
        <p className="text-[10px] text-[var(--text-dim)]">Joined {new Date(member.joinedAt).toLocaleDateString()}</p>
      </div>
      {canManage ? (
        <select
          value={member.role}
          disabled={isChangingRole}
          onChange={e => onChangeRole(member.userId, e.target.value as AssignableRole)}
          className="text-xs px-2 py-1 rounded-md border border-[var(--rail)] bg-[var(--surface)] text-[var(--text)] capitalize flex-shrink-0 disabled:opacity-50"
          aria-label={`Role for ${member.email}`}
        >
          {ASSIGNABLE_ROLES.map(r => (
            <option key={r} value={r}>{r}</option>
          ))}
        </select>
      ) : (
        <span className={`text-xs px-2 py-0.5 rounded-full border capitalize flex-shrink-0 ${ROLE_COLORS[member.role] ?? ROLE_COLORS.viewer}`}>
          {member.role}
        </span>
      )}
      {canManage && (
        <button
          onClick={() => onRemove(member.userId)}
          disabled={isRemoving}
          className="text-xs text-[var(--danger)] hover:text-[var(--danger)] px-1 flex-shrink-0 disabled:opacity-50"
        >
          {isRemoving ? 'Removing…' : 'Remove'}
        </button>
      )}
    </div>
  );
}
