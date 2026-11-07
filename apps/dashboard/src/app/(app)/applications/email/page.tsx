'use client';

import Link from 'next/link';
import { HugeiconsIcon } from '@hugeicons/react';
import { ArrowLeft01Icon } from '@hugeicons/core-free-icons';

import { useAuth } from '@/contexts/auth-context';
import { EmailConsoleCard } from '@/components/applications/email/email-console-card';
import { EmailClientCard } from '@/components/applications/email/email-client-card';
import { EmailDomainsCard } from '@/components/applications/email/email-domains-card';
import { useEmailApplication } from '@/components/applications/email/use-email-application';

/**
 * The mail application, in detail.
 *
 * The Applications screen says "Email — send and receive mail on your own
 * domain" and links to the console, which is a dead end for anyone who has
 * not used it before: there is no username, no password, no host and port,
 * and no idea what to do with a domain once it is connected.
 *
 * This is that page: the console and its credential, the client settings to
 * copy, and the domains and aliases the platform holds.
 */
export default function EmailApplicationPage() {
  const { getSdk } = useAuth();
  const { loading, consoleConfig, domains, aliases, error } = useEmailApplication(getSdk);

  return (
    <div className="max-w-3xl">
      <Link
        href="/applications"
        className="inline-flex items-center gap-1.5 text-xs text-[var(--text-muted)] hover:text-[var(--text)] transition-colors mb-3"
      >
        <HugeiconsIcon icon={ArrowLeft01Icon} size={12} /> Back to applications
      </Link>

      <h1 className="text-xl font-bold text-[var(--text)] mb-1">Email</h1>
      <p className="text-sm text-[var(--text-muted)] mb-6">
        Send and receive mail on your own domain, with deliverability, aliases and inbound.
      </p>

      {error && (
        <p className="text-sm text-[var(--danger)] mb-4" role="alert">
          {error}
        </p>
      )}

      <div className="space-y-4">
        <EmailConsoleCard config={consoleConfig} />
        <EmailClientCard config={consoleConfig} />
        <EmailDomainsCard domains={domains} aliases={aliases} />
      </div>

      {loading && (
        <p className="text-xs text-[var(--text-dim)] mt-4" aria-live="polite">
          Reading the mail configuration…
        </p>
      )}

      <p className="text-xs text-[var(--text-dim)] mt-6">
        Mailboxes, aliases, templates and webhooks live in the{' '}
        <Link href="/email" className="text-[var(--accent)] hover:underline">
          mail console
        </Link>
        .
      </p>
    </div>
  );
}
