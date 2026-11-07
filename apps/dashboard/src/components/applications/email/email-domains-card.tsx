'use client';

import Link from 'next/link';
import { Badge } from '@fidscript/ui';
import { HugeiconsIcon } from '@hugeicons/react';
import { ArrowRight01Icon, CheckmarkCircle02Icon, InformationCircleIcon } from '@hugeicons/core-free-icons';

import type { MailAlias, MailDomain } from './use-email-application';

interface EmailDomainsCardProps {
  domains: MailDomain[];
  aliases: MailAlias[];
}

/**
 * The domains this platform receives mail for, and the aliases on them.
 *
 * **Auto integration** is the switch on a domain: when it is on, connecting
 * the domain makes the platform publish its MX, SPF and DKIM records through
 * the domain's DNS provider, so mail starts working without the operator
 * copying a record by hand.
 */
export function EmailDomainsCard({ domains, aliases }: EmailDomainsCardProps) {
  return (
    <div className="rounded-xl border border-[var(--rail)] bg-[var(--surface)] p-5">
      <div className="flex items-start justify-between gap-4 mb-4">
        <div>
          <h2 className="text-sm font-semibold text-[var(--text)]">Domains and aliases</h2>
          <p className="text-xs text-[var(--text-muted)] mt-1">
            The domains this platform receives mail for, and the aliases that forward it.
          </p>
        </div>
        <Link
          href="/email"
          className="inline-flex items-center gap-1.5 text-xs text-[var(--accent)] hover:underline flex-shrink-0"
        >
          Manage mail
          <HugeiconsIcon icon={ArrowRight01Icon} size={12} />
        </Link>
      </div>

      {domains.length === 0 ? (
        <p className="text-xs text-[var(--text-muted)]">
          No domain is connected to the mail server yet. Connect one from the mail console —
          the platform publishes the MX, SPF and DKIM records for you.
        </p>
      ) : (
        <ul className="space-y-2">
          {domains.map(domain => (
            <li
              key={`${domain.projectId}-${domain.id}`}
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg border border-[var(--rail)] bg-[var(--surface-2)]"
            >
              <HugeiconsIcon
                icon={domain.status?.toLowerCase() === 'active' ? CheckmarkCircle02Icon : InformationCircleIcon}
                size={14}
                className={domain.status?.toLowerCase() === 'active' ? 'text-[var(--success)]' : 'text-[var(--warning)]'}
              />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-mono text-[var(--text)] truncate">{domain.domain}</p>
                <p className="text-[11px] text-[var(--text-dim)]">{domain.projectName}</p>
              </div>
              <Badge variant={domain.dnsMode === 'cloudflare_auto' ? 'success' : 'default'}>
                {domain.dnsMode === 'cloudflare_auto' ? 'Auto integration' : 'Manual DNS'}
              </Badge>
            </li>
          ))}
        </ul>
      )}

      {aliases.length > 0 && (
        <>
          <p className="text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider mt-5 mb-2">
            Aliases
          </p>
          <ul className="space-y-1.5">
            {aliases.map(alias => (
              <li key={`${alias.projectId}-${alias.id}`} className="flex items-center gap-3 text-xs">
                <span className="font-mono text-[var(--text)] truncate">{alias.alias}</span>
                <span className="text-[var(--text-dim)] truncate">
                  → {(alias.targets ?? []).map(t => t.address ?? t.type).join(', ') || 'no target'}
                </span>
                <span className="ml-auto text-[var(--text-dim)] flex-shrink-0">{alias.projectName}</span>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
