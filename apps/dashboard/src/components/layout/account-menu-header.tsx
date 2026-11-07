'use client';

import { Badge } from '@fidscript/ui';
import type { User } from '@/types';

/**
 * The account menu's header — who is signed in, at a glance.
 *
 * It shows the real name and the real address, and the role the platform
 * actually holds, so the person reading it can tell at a glance whether
 * they are the operator, a developer or a viewer.
 */

export function roleLabel(role?: string): string {
  switch (role?.toUpperCase()) {
    case 'OWNER':
      return 'Platform owner';
    case 'ADMIN':
      return 'Platform admin';
    case 'DEVELOPER':
      return 'Developer';
    case 'VIEWER':
      return 'Viewer';
    default:
      return role ? role.toLowerCase() : 'Member';
  }
}

export function roleVariant(role?: string): 'accent' | 'info' | 'success' | 'default' {
  switch (role?.toUpperCase()) {
    case 'OWNER':
      return 'accent';
    case 'ADMIN':
      return 'info';
    case 'DEVELOPER':
      return 'success';
    default:
      return 'default';
  }
}

interface AccountMenuHeaderProps {
  user: User;
  initials: string;
  color: string;
}

export function AccountMenuHeader({ user, initials, color }: AccountMenuHeaderProps) {
  return (
    <div className="flex items-start gap-3 px-4 py-3 border-b border-[var(--rail)]">
      <div
        className={`w-10 h-10 rounded-full ${color} text-[var(--text)] text-sm font-semibold flex items-center justify-center flex-shrink-0`}
      >
        {initials}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-[var(--text)] truncate">
          {user.name || user.email}
        </p>
        <p className="text-xs text-[var(--text-muted)] truncate mt-0.5">{user.email}</p>
        <Badge variant={roleVariant(user.role)} className="mt-2">
          {roleLabel(user.role)}
        </Badge>
      </div>
    </div>
  );
}
