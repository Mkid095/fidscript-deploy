import { redirect } from 'next/navigation';

import { getProject } from '@/lib/api/project';
import { getEmailApiKeys, getEmailDomains, getEmailMailboxes, getEmailStatus } from '@/lib/api/email';
import { Card, PageHeader, SectionHeader } from '@/components/ui/card';
import { Badge, EmptyState } from '@/components/ui/feedback';
import { EmailStatusCard } from '@/components/project/email-status-card';
import { EmailDomainForm } from '@/components/project/email-domain-form';
import { EmailMailboxForm } from '@/components/project/email-mailbox-form';
import { EmailSendForm } from '@/components/project/email-send-form';

export const metadata = { title: 'Email' };

/**
 * The project's email.
 *
 * A domain, a mailbox, and a way to send. The mail server behind it is
 * never named — this is the only face of it.
 */
export default async function ProjectEmailPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;

  const project = await getProject(projectId).catch(() => null);
  if (!project) redirect('/projects');

  const [status, domains, mailboxes, apiKeys] = await Promise.all([
    getEmailStatus(project.id),
    getEmailDomains(project.id),
    getEmailMailboxes(project.id),
    getEmailApiKeys(project.id),
  ]);

  const domainNames = domains.map((domain) => domain.domain);
  const senders = mailboxes
    .filter((mailbox) => mailbox.isActive)
    .map((mailbox) => {
      const domain = domains.find((candidate) => candidate.id === mailbox.domainId);
      return domain ? `${mailbox.localPart}@${domain.domain}` : mailbox.localPart;
    });

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <PageHeader
        title="Email"
        description="Send and receive mail for this project."
      />

      <section>
        <SectionHeader
          title="How it stands"
          description="What has to be true before a message leaves."
        />
        <EmailStatusCard status={status} />
      </section>

      <section>
        <SectionHeader title="Domains" description="The domains the mail is for." />
        <Card className="mb-3">
          {domains.length === 0 ? (
            <EmptyState
              title="No mail domain yet"
              body="Add the domain the mail will be sent and received for."
            />
          ) : (
            <ul className="divide-y divide-rail">
              {domains.map((domain) => (
                <li key={domain.id} className="px-4 py-3">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <p className="text-sm text-text">{domain.domain}</p>
                    <Badge tone={domain.status === 'ACTIVE' ? 'success' : 'warning'}>
                      {domain.status.toLowerCase()}
                    </Badge>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <Record ok={domain.mxVerified} label="MX" />
                    <Record ok={domain.spfVerified} label="SPF" />
                    <Record ok={domain.dkimVerified} label="DKIM" />
                    <Record ok={domain.dmarcVerified} label="DMARC" />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>
        <Card>
          <EmailDomainForm
            projectId={project.id}
            domainId={domains[0]?.id}
          />
        </Card>
      </section>

      <section>
        <SectionHeader title="Mailboxes" description="The mailboxes of this project." />
        <Card className="mb-3">
          {mailboxes.length === 0 ? (
            <EmptyState
              title="No mailbox yet"
              body="A mailbox is an address the mail arrives at."
            />
          ) : (
            <ul className="divide-y divide-rail">
              {mailboxes.map((mailbox) => {
                const domain = domains.find((candidate) => candidate.id === mailbox.domainId);
                return (
                  <li key={mailbox.id} className="flex items-center justify-between gap-4 px-4 py-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm text-text">
                        {mailbox.localPart}
                        {domain ? `@${domain.domain}` : ''}
                      </p>
                      {mailbox.name ? (
                        <p className="truncate text-xs text-text-dim">{mailbox.name}</p>
                      ) : null}
                    </div>
                    <Badge tone={mailbox.isActive ? 'success' : 'neutral'}>
                      {mailbox.isActive ? 'active' : 'suspended'}
                    </Badge>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>
        <Card>
          <EmailMailboxForm projectId={project.id} domains={domainNames} />
        </Card>
      </section>

      <section>
        <SectionHeader title="Sending" description="Send a message and see that it goes." />
        <Card className="mb-3">
          <dl className="divide-y divide-rail">
            <Fact term="SMTP" value={status?.smtpHost ?? 'Not available'} />
            <Fact term="IMAP" value={status?.imapHost ?? 'Not available'} />
            <Fact term="JMAP" value={status?.jmapUrl ?? 'Not available'} />
            <Fact term="Keys" value={String(apiKeys.length)} />
          </dl>
        </Card>
        <Card>
          <EmailSendForm projectId={project.id} senders={senders} />
        </Card>
      </section>
    </div>
  );
}

function Record({ ok, label }: { ok: boolean; label: string }) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[11px] ${
        ok ? 'border-success/40 text-success' : 'border-rail text-text-dim'
      }`}
    >
      {label} {ok ? '✓' : '—'}
    </span>
  );
}

function Fact({ term, value }: { term: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 px-4 py-2.5">
      <dt className="text-sm text-text-muted">{term}</dt>
      <dd className="truncate text-sm text-text">{value}</dd>
    </div>
  );
}
