'use client';

import Link from 'next/link';
import { HugeiconsIcon } from '@hugeicons/react';
import { Mail01Icon, UsbConnectedIcon } from '@hugeicons/core-free-icons';

/**
 * The platform's own surfaces.
 *
 * The mail server's administration console, its settings and the Cloudflare
 * connection the platform uses were three screens with **no way in** — they
 * existed, and nothing linked to them. They belong to the platform rather
 * than to a project, so they live here, under the account's settings.
 */
export function PlatformSettings() {
  return (
    <div className="rounded-xl border border-[var(--rail)] bg-[var(--surface)] p-5 mb-6">
      <h2 className="text-sm font-semibold text-[var(--text)] mb-3">This platform</h2>
      <ul className="space-y-2">
        <li>
          <Link
            href="/platform/email"
            className="flex items-center gap-2 text-xs text-[var(--text-muted)] hover:text-[var(--text)] no-underline"
          >
            <HugeiconsIcon icon={Mail01Icon} size={14} className="text-[var(--text-dim)]" />
            Mail console — the platform's mailboxes, aliases and routing
          </Link>
        </li>
        <li>
          <Link
            href="/platform/email/settings"
            className="flex items-center gap-2 text-xs text-[var(--text-muted)] hover:text-[var(--text)] no-underline"
          >
            <HugeiconsIcon icon={Mail01Icon} size={14} className="text-[var(--text-dim)]" />
            Mail settings — attachments and the connection
          </Link>
        </li>
        <li>
          <Link
            href="/platform/integrations/settings"
            className="flex items-center gap-2 text-xs text-[var(--text-muted)] hover:text-[var(--text)] no-underline"
          >
            <HugeiconsIcon icon={UsbConnectedIcon} size={14} className="text-[var(--text-dim)]" />
            Integrations — the platform's Cloudflare connection
          </Link>
        </li>
      </ul>
    </div>
  );
}
