'use client';

import { Card } from '@fidscript/ui';
import { useAuth } from '@/contexts/auth-context';

export function AccountSettings() {
  const { user } = useAuth();
  return (
    <Card className="border border-[var(--rail)] mb-6">
      <h2 className="text-sm font-semibold text-[var(--text)] mb-4">Profile</h2>
      <div className="flex flex-col gap-3">
        <div>
          <p className="text-xs text-[var(--text-muted)] mb-1">Email</p>
          <p className="text-sm text-[var(--text)]">{user?.email ?? '—'}</p>
        </div>
        <div>
          <p className="text-xs text-[var(--text-muted)] mb-1">Name</p>
          <p className="text-sm text-[var(--text)]">{user?.name ?? '—'}</p>
        </div>
        <div>
          <p className="text-xs text-[var(--text-muted)] mb-1">Role</p>
          <p className="text-sm text-[var(--text)] capitalize">{user?.role ?? '—'}</p>
        </div>
      </div>
    </Card>
  );
}
