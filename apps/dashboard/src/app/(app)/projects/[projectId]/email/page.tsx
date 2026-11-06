'use client';

import { useState } from 'react';
import Link from 'next/link';

import { useProjectContext } from '@/contexts/project-context';
import { EmailTabs, type EmailTab } from './email-tabs';

export default function ProjectEmailPage() {
  const [active, setActive] = useState<EmailTab>('domains');
  const { projectId } = useProjectContext();

  return (
    <div className="p-6 max-w-5xl space-y-5">
      <header>
        <h1 className="text-lg font-semibold text-[var(--text)]">Email</h1>
        <p className="text-xs text-[var(--text-dim)] mt-0.5">
          Self-hosted mail: domains, mailboxes, aliases, sender identities, API keys, and messages.
        </p>
      </header>

      <aside
        role="note"
        className="rounded-lg border border-amber-500/30 bg-amber-500/5 px-4 py-3 text-xs text-[var(--text-dim)] leading-relaxed"
      >
        <strong className="text-[var(--text)]">Backend honesty:</strong> mailboxes are created
        with an auto-generated password (the value you submit is ignored) and the temporary
        password is shown only once. Suspending a mailbox only flips the DB flag — the Stalwart
        v0.15.5 API cannot actually disable the IMAP/SMTP account. Inbound webhooks
        (MAIL-32/33/34) are open unless <code className="font-mono text-[var(--accent)]">STALWART_WEBHOOK_SECRET</code> is set
        on the platform.
      </aside>

      <EmailTabs active={active} onChange={setActive} />

      {projectId && (
        <nav aria-label="More about the email" className="flex flex-wrap items-center gap-3 text-xs">
          <span className="text-[var(--text-dim)]">More:</span>
          <Link href={`/projects/${projectId}/email/analytics`} className="text-[var(--text-muted)] hover:text-[var(--text)]">
            Analytics
          </Link>
          <Link href={`/projects/${projectId}/email/templates`} className="text-[var(--text-muted)] hover:text-[var(--text)]">
            Templates
          </Link>
          <Link href={`/projects/${projectId}/email/webhooks`} className="text-[var(--text-muted)] hover:text-[var(--text)]">
            Webhooks
          </Link>
          <Link href={`/projects/${projectId}/email/suppressions`} className="text-[var(--text-muted)] hover:text-[var(--text)]">
            Suppressions
          </Link>
        </nav>
      )}
    </div>
  );
}
