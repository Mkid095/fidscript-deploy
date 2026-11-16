import { redirect } from 'next/navigation';

import { getProject } from '@/lib/api/project';
import { getDnsConnection } from '@/lib/api/domains';
import {
  getEmailAliases,
  getEmailAnalytics,
  getEmailApiKeys,
  getEmailCatchAll,
  getEmailDomains,
  getEmailMailboxes,
  getEmailMessages,
  getEmailStatus,
  getEmailWebhooks,
} from '@/lib/api/email';
import { Page } from '@/components/ui/page';
import { EmailWorkbench } from '@/components/project/email-workbench';

export const metadata = { title: 'Email' };

/**
 * The project's email.
 *
 * The mail server behind this is never named — this is the only face of it.
 * The screen is a workbench: the setup progress says what is left, and the
 * tabs hold the work — the domains and their records, the mailboxes and
 * their aliases, the sending, the inbound routing, and what has happened.
 * Every figure is the platform's own, read at the moment the screen is
 * painted.
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

  // The catch-all of the first domain — where unmatched mail lands, if
  // anywhere. The setup's "route inbound" step is real when it is set.
  const catchAll =
    domains.length > 0
      ? await getEmailCatchAll(project.id, domains[0].id)
      : null;

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
      <EmailWorkbench
        projectId={project.id}
        status={status}
        domains={domains}
        mailboxes={mailboxes.map((mailbox) => ({
          ...mailbox,
          domain:
            domains.find(
              (candidate) => candidate.id === mailbox.domainId,
            )?.domain ?? '',
        }))}
        aliases={aliases}
        apiKeys={apiKeys}
        messages={messages}
        analytics={analytics}
        webhooks={webhooks}
        catchAll={catchAll}
        canWriteDns={connection !== null}
        domainNames={domainNames}
        senders={senders}
      />
    </Page>
  );
}
