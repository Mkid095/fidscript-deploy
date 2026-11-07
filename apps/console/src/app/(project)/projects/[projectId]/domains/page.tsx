import { redirect } from 'next/navigation';

import { getProject } from '@/lib/api/project';
import { getDnsConnection, getDnsRecords } from '@/lib/api/domains';
import { getDomains } from '@/lib/api/resources';
import { Card, SectionHeader } from '@/components/ui/card';
import { Page } from '@/components/ui/page';
import { EmptyState } from '@/components/ui/feedback';
import { DnsConnectionCard } from '@/components/project/dns-connection-card';
import { DomainCard } from '@/components/project/domain-card';
import { ProjectAddDomainForm } from '@/components/project/project-add-domain-form';
import { DomainZonePicker } from '@/components/project/domain-zone-picker';

export const metadata = { title: 'Domains' };

/**
 * The project's domains.
 *
 * Where the project answers — and the DNS that makes it answer.
 *
 * The account that holds the domain can be connected, and then the
 * platform writes the records itself. Without it, the records are shown
 * and the person sets them.
 */
export default async function ProjectDomainsPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;

  const project = await getProject(projectId).catch(() => null);
  if (!project) redirect('/projects');

  const [domains, connection] = await Promise.all([
    getDomains(project.id).catch(() => []),
    getDnsConnection(project.id),
  ]);

  const records = await Promise.all(
    domains.map((domain) =>
      getDnsRecords(project.id, domain.id).catch(() => null),
    ),
  );

  const canWrite = connection !== null;

  return (
    <Page
      title="Domains"
      description="Where this project answers, and the DNS that makes it answer."
    >
      <section>
        <SectionHeader
          title="Your DNS account"
          description="Connect it, and the platform writes the records for you."
        />
        <DnsConnectionCard projectId={project.id} connection={connection} />
      </section>

      <section>
        <SectionHeader title="The domains" />
        {domains.length === 0 ? (
          <Card>
            <EmptyState
              title="No domain yet"
              body="A deployment can answer on a subdomain. A domain of your own needs its DNS pointed here."
            />
          </Card>
        ) : (
          <div className="space-y-3">
            {domains.map((domain, index) => (
              <DomainCard
                key={domain.id}
                projectId={project.id}
                domainId={domain.id}
                domain={domain.domain}
                status={domain.dnsStatus ?? 'pending'}
                records={records[index]?.records ?? []}
                canWrite={canWrite}
              />
            ))}
          </div>
        )}
      </section>

      <section>
        <SectionHeader
          title="Add a domain"
          description={
            canWrite
              ? 'Pick the domain out of the connected account, and the platform writes the records.'
              : 'The records are shown, and you set them yourself.'
          }
        />
        <Card>
          {canWrite ? (
            <DomainZonePicker projectId={project.id} />
          ) : (
            <ProjectAddDomainForm projectId={project.id} canWrite={canWrite} />
          )}
        </Card>
      </section>
    </Page>
  );
}
