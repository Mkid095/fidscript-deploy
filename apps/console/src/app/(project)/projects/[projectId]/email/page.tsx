import { redirect } from 'next/navigation';

import { getProject } from '@/lib/api/project';
import { getDnsConnection } from '@/lib/api/domains';
import {
  getEmailAliases,
  getEmailAnalytics,
  getEmailApiKeys,
  getEmailDomains,
  getEmailMailboxes,
  getEmailMessages,
  getEmailStatus,
  getEmailWebhooks,
} from '@/lib/api/email';
import { Card, SectionHeader } from '@/components/ui/card';
import { Page } from '@/components/ui/page';
import { EmailStatusCard } from '@/components/project/email-status-card';
import { EmailDomainsSection } from '@/components/project/email-domains-section';
import { EmailMailboxesSection } from '@/components/project/email-mailboxes-section';
import { EmailAliasesSection } from '@/components/project/email-aliases-section';
import { EmailKeysSection } from '@/components/project/email-keys-section';
import { EmailSendForm } from '@/components/project/email-send-form';
import { EmailDeliverabilitySection } from '@/components/project/email-deliverability-section';
import { EmailLogsSection } from '@/components/project/email-logs-section';
import { EmailInboundPanel } from '@/components/project/email-inbound-panel';

export const metadata = { title: 'Email' };

/**
 * The project's email.
 *
 * The mail server behind this is never named — this is the only face of
 * it. A domain, a mailbox, an alias, a key, and a way to send.
 */
export default async function ProjectEmailPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;

  const project = await getProject(projectId).catch(() => null);
  if (!project) redirect('/projects');

  const [
    status,
    domains,
    mailboxes,
    aliases,
    apiKeys,
    messages,
    analytics,
    connection,
    webhooks,
  ] = await Promise.all([
    getEmailStatus(project.id),
    getEmailDomains(project.id),
    getEmailMailboxes(project.id),
    getEmailAliases(project.id),
    getEmailApiKeys(project.id),
    getEmailMessages(project.id),
    getEmailAnalytics(project.id),
    getDnsConnection(project.id),
    getEmailWebhooks(project.id),
  ]);

  const domainNames = domains.map((domain) => domain.domain);
  const senders = mailboxes
    .filter((mailbox) => mailbox.isActive)
    .map((mailbox) => {
      const domain = domains.find(
        (candidate) => candidate.id === mailbox.domainId,
      );
      return domain
        ? `${mailbox.localPart}@${domain.domain}`
        : mailbox.localPart;
    });

  return (
    <Page title="Email" description="Send and receive mail for this project.">
      <section>
        <SectionHeader
          title="How it stands"
          description="What has to be true before a message leaves."
        />
        <EmailStatusCard status={status} projectId={project.id} />
      </section>

      <section>
        <SectionHeader
          title="Domains"
          description="The domains the mail is for, and the records they need."
        />
        <EmailDomainsSection
          projectId={project.id}
          domains={domains}
          canWriteDns={connection !== null}
        />
      </section>

      <section>
        <SectionHeader
          title="Mailboxes"
          description="The addresses the mail arrives at."
        />
        <EmailMailboxesSection
          projectId={project.id}
          mailboxes={mailboxes.map((mailbox) => ({
            ...mailbox,
            domain:
              domains.find((candidate) => candidate.id === mailbox.domainId)
                ?.domain ?? '',
          }))}
          domains={domainNames}
        />
      </section>

      <section>
        <SectionHeader
          title="Aliases"
          description="Addresses that forward somewhere else."
        />
        <EmailAliasesSection
          projectId={project.id}
          aliases={aliases}
          domains={domainNames}
        />
      </section>

      <section>
        <SectionHeader
          title="Sending"
          description="The addresses, the keys, and a message to prove it works."
        />
        <div className="space-y-3">
          <Card className="divide-y divide-rail">
            <Fact term="SMTP" value={status?.smtpHost ?? 'Not available'} />
            <Fact term="IMAP" value={status?.imapHost ?? 'Not available'} />
            <Fact term="JMAP" value={status?.jmapUrl ?? 'Not available'} />
          </Card>
          <EmailKeysSection projectId={project.id} keys={apiKeys} />
          <Card>
            <EmailSendForm projectId={project.id} senders={senders} />
          </Card>
        </div>
      </section>

      <section>
        <SectionHeader
          title="Inbound"
          description="Where the mail goes when it arrives."
        />
        <EmailInboundPanel
          projectId={project.id}
          domains={domains}
          mailboxes={mailboxes}
          webhooks={webhooks}
        />
      </section>

      <section>
        <SectionHeader
          title="Deliverability"
          description="What happened to the mail the project sent."
        />
        <EmailDeliverabilitySection analytics={analytics} />
      </section>

      <section>
        <SectionHeader
          title="Messages"
          description="What left, and what arrived."
        />
        <EmailLogsSection messages={messages} />
      </section>
    </Page>
  );
}

function Fact({ term, value }: { term: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 px-4 py-2.5">
      <span className="text-sm text-text-muted">{term}</span>
      <span className="truncate text-sm text-text">{value}</span>
    </div>
  );
}
