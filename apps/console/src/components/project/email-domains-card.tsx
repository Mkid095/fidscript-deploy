'use client';

import { useEffect, useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Dialog } from '@/components/ui/dialog';
import { Badge, EmptyState, ErrorState } from '@/components/ui/feedback';
import { useToast } from '@/components/ui/toast';
import type {
  EmailDomain,
  EmailStatus,
} from '@/lib/api/email';

import {
  addEmailDomainAction,
  setupEmailAction,
  verifyEmailDomainAction,
} from '@/app/(project)/projects/[projectId]/email/actions';

const RECORD_PURPOSES = ['MX', 'SPF', 'DKIM', 'DMARC'] as const;
type Purpose = (typeof RECORD_PURPOSES)[number];

function isDomainActive(domain: EmailDomain): boolean {
  return (
    domain.status === 'ACTIVE' ||
    (domain.mxVerified &&
      domain.spfVerified &&
      domain.dkimVerified &&
      domain.dmarcVerified)
  );
}

function recordValue(
  purpose: Purpose,
  domain: EmailDomain,
  status: EmailStatus | null,
): string {
  const isPrimary = status !== null && status.domain === domain.domain;
  if (!isPrimary) return '—';
  switch (purpose) {
    case 'MX':
      return status.mx.host ?? '—';
    case 'DKIM':
      return status.dkim.publicKey ?? '—';
    default:
      return '—';
  }
}

function recordName(
  purpose: Purpose,
  domain: EmailDomain,
  status: EmailStatus | null,
): string {
  switch (purpose) {
    case 'DKIM': {
      const selector =
        status?.dkim.selector ?? domain.dkimSelector ?? 'selector';
      return `${selector}._domainkey.${domain.domain}`;
    }
    case 'DMARC':
      return `_dmarc.${domain.domain}`;
    default:
      return domain.domain;
  }
}

function recordVerified(purpose: Purpose, domain: EmailDomain): boolean {
  switch (purpose) {
    case 'MX':
      return domain.mxVerified;
    case 'SPF':
      return domain.spfVerified;
    case 'DKIM':
      return domain.dkimVerified;
    case 'DMARC':
      return domain.dmarcVerified;
  }
}

/**
 * The domains the mail is for.
 *
 * Each domain shows the four records it needs, with the value where the
 * platform holds one, and what is actually confirmed — a record that has not
 * been checked reads "pending" and never reads "done". One click writes all
 * four through the project's own DNS connection; re-checking asks the public
 * DNS what it says now.
 */
export function EmailDomainsCard({
  projectId,
  domains,
  status,
  canWriteDns,
}: {
  projectId: string;
  domains: EmailDomain[];
  status: EmailStatus | null;
  canWriteDns: boolean;
}) {
  const toast = useToast();
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [working, setWorking] = useState(false);
  const [adding, setAdding] = useState(false);

  const waiting = domains.some((domain) => !isDomainActive(domain));

  /**
   * While the records are not all confirmed, the screen asks the public DNS
   * for the truth itself — every half minute, until every record is
   * verified. A re-check that fails (the session rolled, the DNS not
   * resolvable yet) is not the end of the world: the next tick tries
   * again, and the numbers the screen shows are still the last true ones.
   */
  useEffect(() => {
    if (!waiting) return;
    const tick = () => {
      void (async () => {
        for (const domain of domains) {
          if (isDomainActive(domain)) continue;
          const result = await verifyEmailDomainAction(projectId, domain.id);
          if (!result.error) {
            await router.refresh();
            return; // the new data decides whether there is a next tick
          }
        }
      })();
    };
    const interval = setInterval(tick, 30_000);
    return () => clearInterval(interval);
  }, [waiting, domains, projectId, router]);

  return (
    <div className="space-y-4">
      {domains.length === 0 ? (
        <Card>
          <EmptyState
            title="No mail domain yet"
            body="A mail domain is the address your mail comes from and goes to. It needs four DNS records before a message can leave."
            action={<AddDomainButton onOpen={() => setAdding(true)} />}
          />
        </Card>
      ) : (
        domains.map((domain) => {
          const active = isDomainActive(domain);
          return (
            <Card key={domain.id}>
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-rail px-4 py-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-text">
                    {domain.domain}
                  </p>
                  <p className="mt-0.5 text-xs text-text-dim">
                    {active
                      ? 'It sends and receives.'
                      : 'Mail cannot be sent or received until the records below are confirmed.'}
                  </p>
                </div>
                <Badge tone={active ? 'success' : 'warning'}>
                  {active ? 'Active' : domain.status.toLowerCase()}
                </Badge>
              </div>

              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-rail text-xs text-text-dim">
                    <th className="px-4 py-2 font-medium">Record</th>
                    <th className="px-4 py-2 font-medium">Name</th>
                    <th className="hidden px-4 py-2 font-medium md:table-cell">
                      Value
                    </th>
                    <th className="px-4 py-2 text-right font-medium">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-rail">
                  {RECORD_PURPOSES.map((purpose) => {
                    const value = recordValue(purpose, domain, status);
                    const verified = recordVerified(purpose, domain);
                    return (
                      <tr key={purpose}>
                        <td className="px-4 py-2.5 text-sm text-text">
                          {purpose}
                        </td>
                        <td className="px-4 py-2.5 font-mono text-xs text-text-muted">
                          {recordName(purpose, domain, status)}
                        </td>
                        <td className="hidden px-4 py-2.5 md:table-cell">
                          <span className="flex min-w-0 items-center gap-2">
                            <span className="truncate font-mono text-xs text-text-muted">
                              {value}
                            </span>
                            {value !== '—' ? <CopyButton text={value} /> : null}
                          </span>
                        </td>
                        <td className="px-4 py-2.5 text-right">
                          <Badge tone={verified ? 'success' : 'warning'}>
                            {verified ? 'Verified' : 'Pending'}
                          </Badge>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              <div className="flex flex-wrap items-center gap-2 border-t border-rail px-4 py-3">
                {canWriteDns && !active ? (
                  <Button
                    variant="primary"
                    size="sm"
                    loading={working}
                    onClick={() => {
                      setWorking(true);
                      startTransition(async () => {
                        const result = await setupEmailAction(
                          projectId,
                          domain.domain,
                        );
                        setWorking(false);
                        if (result.error) {
                          toast.error(result.error);
                        } else if (result.status === 'ACTIVE') {
                          toast.success(
                            'The records are set and confirmed.',
                          );
                        } else {
                          toast.info(
                            'The records were written. They confirm as they spread.',
                          );
                        }
                      });
                    }}
                  >
                    {working ? 'Publishing…' : 'Publish via Cloudflare'}
                  </Button>
                ) : null}
                <Button
                  variant="secondary"
                  size="sm"
                  loading={pending}
                  onClick={() => {
                    startTransition(async () => {
                      const result = await verifyEmailDomainAction(
                        projectId,
                        domain.id,
                      );
                      if (result.error) toast.error(result.error);
                      else
                        toast.success(
                          'The records were checked against the public DNS.',
                        );
                    });
                  }}
                >
                  Re-check the records
                </Button>
                {canWriteDns ? (
                  <span className="text-xs text-text-dim">
                    DNS changes can take up to 48 hours to spread.
                  </span>
                ) : (
                  <Link
                    href={`/projects/${projectId}/domains`}
                    className="text-xs text-accent hover:underline"
                  >
                    Connect your DNS account, and the platform writes them for
                    you
                  </Link>
                )}
                {waiting ? (
                  <span className="text-xs text-text-dim">
                    Checking again every half minute until everything is
                    confirmed.
                  </span>
                ) : null}
              </div>
            </Card>
          );
        })
      )}

      <div className="flex items-center justify-between gap-3">
        <p className="text-xs text-text-dim">
          The project&apos;s name is the one the mail rides on; another is
          only for mail that belongs to something else.
        </p>
        <AddDomainButton onOpen={() => setAdding(true)} />
      </div>

      <AddDomainDialog
        projectId={projectId}
        open={adding}
        onClose={() => setAdding(false)}
      />
    </div>
  );
}

function AddDomainButton({ onOpen }: { onOpen: () => void }) {
  return (
    <Button variant="secondary" size="sm" onClick={onOpen}>
      Add another domain
    </Button>
  );
}

/**
 * A second domain, when the project wants one — a panel over the page, not
 * another card at the end of the scroll.
 *
 * The platform answers with the records to set; the owner sets them where
 * they live, and the records get checked on the same card.
 */
function AddDomainDialog({
  projectId,
  open,
  onClose,
}: {
  projectId: string;
  open: boolean;
  onClose: () => void;
}) {
  const router = useRouter();
  const [domain, setDomain] = useState('');
  const [steps, setSteps] = useState<string[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const add = () => {
    setError(null);
    setSteps(null);
    startTransition(async () => {
      const result = await addEmailDomainAction(projectId, domain);
      if (result.error) setError(result.error);
      else {
        setSteps(result.steps ?? []);
        setDomain('');
        await router.refresh();
      }
    });
  };

  const close = () => {
    setSteps(null);
    setError(null);
    onClose();
  };

  return (
    <Dialog
      open={open}
      onClose={close}
      title="Add another domain"
      description="The domain the mail will be sent and received for."
      footer={
        <Button
          variant="primary"
          onClick={add}
          loading={pending}
          disabled={!/^[a-z0-9.-]+\.[a-z]{2,}$/i.test(domain.trim())}
        >
          Add the domain
        </Button>
      }
    >
      <div className="space-y-4">
        <Input
          placeholder="store.example.com"
          value={domain}
          onChange={(event) => setDomain(event.target.value)}
          autoFocus
        />
        {error ? <ErrorState message={error} /> : null}
        {steps && steps.length > 0 ? (
          <div className="rounded-md border border-rail bg-surface-2 p-3">
            <p className="text-xs font-medium text-text-muted">
              Set these at your registrar, then check the records:
            </p>
            <ul className="mt-2 space-y-1">
              {steps.map((step, index) => (
                <li key={index} className="font-mono text-xs text-text">
                  {step}
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>
    </Dialog>
  );
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      className="shrink-0 rounded px-1.5 py-0.5 text-[11px] text-text-dim transition-colors hover:bg-surface-2 hover:text-text"
      aria-label={`Copy ${text}`}
      onClick={() => {
        void navigator.clipboard?.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 1200);
      }}
    >
      {copied ? 'Copied' : 'Copy'}
    </button>
  );
}
