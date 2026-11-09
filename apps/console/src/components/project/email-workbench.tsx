'use client';

import { useState } from 'react';

import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/feedback';
import type {
  EmailAlias,
  EmailAnalytics,
  EmailCatchAll,
  EmailDomain,
  EmailMailbox,
  EmailMessage,
  EmailStatus,
  EmailWebhook,
} from '@/lib/api/email';

import {
  EmailSetupCard,
  type EmailTabId,
  type SetupStep,
} from './email-setup-card';
import { EmailDomainsCard } from './email-domains-card';
import { EmailActivityCard } from './email-activity-card';
import { EmailMailboxesSection } from './email-mailboxes-section';
import { EmailAliasesSection } from './email-aliases-section';
import { EmailKeysSection } from './email-keys-section';
import { EmailSendForm } from './email-send-form';
import { EmailInboundPanel } from './email-inbound-panel';

const TABS: Array<{ id: EmailTabId; label: string }> = [
  { id: 'domains', label: 'Domains' },
  { id: 'mailboxes', label: 'Mailboxes' },
  { id: 'sending', label: 'Sending' },
  { id: 'inbound', label: 'Inbound' },
  { id: 'activity', label: 'Activity' },
];

/**
 * The email workbench.
 *
 * One screen instead of one long scroll: the setup progress says what is
 * left and where to do it, and the tabs hold the work — the domains and
 * their records, the mailboxes and their aliases, the sending, the inbound
 * routing, and what has happened. Every tab is the platform's own data, and
 * every action is the platform's own endpoint.
 */
export function EmailWorkbench({
  projectId,
  status,
  domains,
  mailboxes,
  aliases,
  apiKeys,
  messages,
  analytics,
  webhooks,
  catchAll,
  canWriteDns,
  domainNames,
  senders,
}: {
  projectId: string;
  status: EmailStatus | null;
  domains: EmailDomain[];
  mailboxes: Array<EmailMailbox & { domain?: string }>;
  aliases: EmailAlias[];
  apiKeys: Array<{ id: string; name: string; createdAt: string }>;
  messages: EmailMessage[];
  analytics: EmailAnalytics | null;
  webhooks: EmailWebhook[];
  catchAll: EmailCatchAll | null;
  canWriteDns: boolean;
  domainNames: string[];
  senders: string[];
}) {
  const [tab, setTab] = useState<EmailTabId>('domains');

  const primary = domains[0] ?? null;
  const domainActive =
    primary !== null &&
    (primary.status === 'ACTIVE' ||
      (primary.mxVerified &&
        primary.spfVerified &&
        primary.dkimVerified &&
        primary.dmarcVerified));

  const steps: SetupStep[] = [
    {
      id: 'domain',
      label: 'Add a domain',
      done: domains.length > 0,
      go: 'domains',
    },
    {
      id: 'dns',
      label: 'Publish the DNS records',
      done: domainActive,
      go: 'domains',
    },
    {
      id: 'mailbox',
      label: 'Create a mailbox',
      done: mailboxes.length > 0,
      go: 'mailboxes',
    },
    {
      id: 'key',
      label: 'Create a sending key',
      done: apiKeys.length > 0,
      go: 'sending',
    },
    {
      id: 'test',
      label: 'Send a test message',
      done: messages.length > 0,
      go: 'activity',
    },
    {
      id: 'inbound',
      label: 'Route inbound mail',
      done: webhooks.length > 0 || catchAll !== null,
      go: 'inbound',
    },
  ];

  return (
    <div className="space-y-6">
      <EmailSetupCard steps={steps} onGo={setTab} />

      <div>
        <nav
          role="tablist"
          aria-label="Email"
          className="flex gap-1 overflow-x-auto border-b border-rail"
        >
          {TABS.map((entry) => (
            <button
              key={entry.id}
              type="button"
              role="tab"
              aria-selected={tab === entry.id}
              onClick={() => setTab(entry.id)}
              className={`-mb-px whitespace-nowrap border-b-2 px-3 py-2 text-sm transition-colors ${
                tab === entry.id
                  ? 'border-accent font-medium text-text'
                  : 'border-transparent text-text-muted hover:text-text'
              }`}
            >
              {entry.label}
            </button>
          ))}
        </nav>

        <div className="pt-4">
          {tab === 'domains' ? (
            <EmailDomainsCard
              projectId={projectId}
              domains={domains}
              status={status}
              canWriteDns={canWriteDns}
            />
          ) : null}

          {tab === 'mailboxes' ? (
            <div className="space-y-4">
              <EmailMailboxesSection
                projectId={projectId}
                mailboxes={mailboxes}
                domains={domainNames}
              />
              <EmailAliasesSection
                projectId={projectId}
                aliases={aliases}
                domains={domainNames}
              />
            </div>
          ) : null}

          {tab === 'sending' ? (
            <div className="space-y-4">
              <ConnectionDetails
                status={status}
                hasMailbox={mailboxes.length > 0}
                goToMailboxes={() => setTab('mailboxes')}
              />
              <EmailKeysSection projectId={projectId} keys={apiKeys} />
              <Card>
                <div className="border-b border-rail px-4 py-3">
                  <p className="text-sm font-medium text-text">
                    Send a test
                  </p>
                  <p className="mt-0.5 text-xs text-text-dim">
                  A message through the platform&apos;s own sending, so
                  somebody can see it works.
                  </p>
                </div>
                <EmailSendForm projectId={projectId} senders={senders} />
              </Card>
            </div>
          ) : null}

          {tab === 'inbound' ? (
            <EmailInboundPanel
              projectId={projectId}
              domains={domains}
              mailboxes={mailboxes}
              webhooks={webhooks}
              catchAll={catchAll}
            />
          ) : null}

          {tab === 'activity' ? (
            <EmailActivityCard analytics={analytics} messages={messages} />
          ) : null}
        </div>
      </div>
    </div>
  );
}

/**
 * Where a client or a piece of code reaches the mail.
 *
 * The details are the platform's own — the hosts it publishes and the URL it
 * answers on — and they appear only once a mailbox exists, because before
 * that there is nobody to read.
 */
function ConnectionDetails({
  status,
  hasMailbox,
  goToMailboxes,
}: {
  status: EmailStatus | null;
  hasMailbox: boolean;
  goToMailboxes: () => void;
}) {
  const rows: Array<{ term: string; value: string }> = [
    { term: 'SMTP', value: status?.smtpHost ?? '' },
    { term: 'IMAP', value: status?.imapHost ?? '' },
    { term: 'JMAP', value: status?.jmapUrl ?? '' },
  ];

  return (
    <Card>
      <div className="border-b border-rail px-4 py-3">
        <p className="text-sm font-medium text-text">Connection details</p>
        <p className="mt-0.5 text-xs text-text-dim">
          Use these in an email client or your own code.
        </p>
      </div>
      {!hasMailbox ? (
        <EmptyState
          title="Locked until you have a mailbox"
          body="SMTP, IMAP and JMAP details appear here once a mailbox exists."
          action={
            <button
              type="button"
              className="text-xs text-accent hover:underline"
              onClick={goToMailboxes}
            >
              Create a mailbox
            </button>
          }
        />
      ) : (
        <div className="divide-y divide-rail">
          {rows.map((row) => (
            <div
              key={row.term}
              className="flex items-center justify-between gap-4 px-4 py-2.5"
            >
              <span className="text-sm text-text-muted">{row.term}</span>
              <span className="truncate font-mono text-xs text-text">
                {row.value || 'Not available'}
              </span>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
