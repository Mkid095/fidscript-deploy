'use client';

import type { AccountKey } from './ai-prompt-generator';
import { SCOPE_DEFINITIONS } from './ai-control-center-data';

export function KeyBadge({ keyItem }: { keyItem: AccountKey }) {
  const scopes = keyItem.permissions.map(p => SCOPE_DEFINITIONS[p]?.label ?? p);
  const expiry = keyItem.expiresAt
    ? new Date(keyItem.expiresAt).toLocaleDateString()
    : 'No expiry';
  return (
    <div className="flex flex-wrap items-center gap-2 text-xs">
      <span className="font-mono text-[var(--text)]">{keyItem.keyPrefix}…</span>
      <span className="text-[var(--text-dim)]">·</span>
      <span className="text-[var(--text-dim)]">Expires {expiry}</span>
      {scopes.length > 0 && (
        <>
          <span className="text-[var(--text-dim)]">·</span>
          <span className="text-[var(--text-dim)]">{scopes.length} scope{scopes.length !== 1 ? 's' : ''}</span>
        </>
      )}
    </div>
  );
}
