'use client';

import type { User } from '@/types';

/**
 * The facts about the account, in the account menu.
 *
 * Everything here is read from the signed-in user — nothing is invented. A
 * credential's TYPE is what the platform knows about the sign-in method; the
 * secret itself is never sent to the browser.
 */

/** How this person signs in — the credential types the platform holds. */
export function signInLabel(user: User): string {
  const types = user.credentials?.map(c => c.type) ?? [];
  if (types.includes('PASSKEY')) return 'Passkey';
  if (types.includes('PASSWORD')) return 'Password';
  if (types.includes('MAGIC_CODE')) return 'Magic code';
  return 'Not set';
}

function memberSince(createdAt?: string): string {
  if (!createdAt) return 'Unknown';
  const date = new Date(createdAt);
  if (Number.isNaN(date.getTime())) return 'Unknown';
  return date.toLocaleDateString(undefined, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

interface AccountMenuDetailsProps {
  user: User;
}

export function AccountMenuDetails({ user }: AccountMenuDetailsProps) {
  const rows = [
    { label: 'Signs in with', value: signInLabel(user) },
    { label: 'Two-factor', value: user.mfaEnabled ? 'Enabled' : 'Not enabled' },
    { label: 'Member since', value: memberSince(user.createdAt) },
  ];

  return (
    <dl className="px-4 py-3 border-b border-[var(--rail)] space-y-1.5">
      {rows.map(row => (
        <div key={row.label} className="flex items-center justify-between gap-4">
          <dt className="text-xs text-[var(--text-muted)]">{row.label}</dt>
          <dd className="text-xs text-[var(--text)] font-medium truncate">{row.value}</dd>
        </div>
      ))}
    </dl>
  );
}
