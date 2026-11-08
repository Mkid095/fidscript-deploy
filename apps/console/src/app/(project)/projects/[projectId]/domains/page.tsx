import { redirect } from 'next/navigation';

import { getProject } from '@/lib/api/project';
import { getDnsConnection, getDnsRecords } from '@/lib/api/domains';
import { getDomains } from '@/lib/api/resources';
import { Card, SectionHeader } from '@/components/ui/card';
import { Page } from '@/components/ui/page';
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
          title="The name it answers on"
          description="A project has a single name. What is registered here is what the app, the mail, and the numbers all ride on."
        />
        {domains.length === 0 ? (
          <Card>
            <div className="mb-3 flex items-center justify-between gap-4 px-4 py-2">
              <p className="text-sm text-text-muted">
                No name yet. Register the project&apos;s one name — the
                platform writes the DNS for it.
              </p>
            </div>
            {canWrite ? (
              <div className="border-t border-rail">
                <DomainZonePicker projectId={project.id} />
              </div>
            ) : (
              <div className="border-t border-rail">
                <ProjectAddDomainForm projectId={project.id} canWrite={canWrite} />
              </div>
            )}
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
                sslStatus={domain.sslStatus}
                sslExpiresAt={domain.sslExpiresAt}
                proxy={
                  (domain.capabilities as Record<string, unknown> | undefined)
                    ?.proxy as 'proxied' | 'dns_only' | 'unknown' | undefined
                }
                hasDeployment={Boolean(domain.deploymentId)}
              />
            ))}
            <p className="px-1 text-xs leading-relaxed text-text-dim">
              One name per project. To answer on a different one, release this
              one first — deleting it takes the platform&apos;s records back to
              how they were and stands the mail down.
            </p>
          </div>
        )}
      </section>

      <section>
        <SectionHeader
          title="Your DNS account"
          description="Connect it, and the platform writes the records for you."
        />
        <DnsConnectionCard projectId={project.id} connection={connection} />
      </section>
    </Page>
  );
}
