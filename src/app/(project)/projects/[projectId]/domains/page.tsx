import { redirect } from 'next/navigation';

import { getProject } from '@/lib/api/project';
import { getDomainInstructions, getDomains } from '@/lib/api/resources';
import { Card, PageHeader, SectionHeader } from '@/components/ui/card';
import { Badge, EmptyState } from '@/components/ui/feedback';
import { ProjectAddDomainForm } from '@/components/project/project-add-domain-form';

export const metadata = { title: 'Domains' };

/**
 * The project's domains.
 *
 * What the project answers on. A domain that is added needs its DNS
 * pointed at the platform — the records come from the API.
 */
export default async function ProjectDomainsPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;

  const project = await getProject(projectId).catch(() => null);
  if (!project) redirect('/projects');

  const domains = await getDomains(project.id).catch(() => []);
  const records = await Promise.all(
    domains.map((domain) => getDomainInstructions(project.id, domain.id).catch(() => [])),
  );

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageHeader title="Domains" description="Where this project answers." />

      <section>
        <SectionHeader title="The domains" />
        <Card>
          {domains.length === 0 ? (
            <EmptyState
              title="No domain yet"
              body="A deployment can answer on a subdomain. A domain of your own needs its DNS pointed here."
            />
          ) : (
            <ul className="divide-y divide-rail">
              {domains.map((domain, index) => (
                <li key={domain.id} className="px-4 py-3">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm text-text">{domain.domain}</p>
                      <p className="mt-0.5 truncate text-xs text-text-dim">
                        {domain.isCustom ? 'your domain' : 'a subdomain of the platform'}
                        {domain.type.length > 0 ? ` · ${domain.type.join(', ').toLowerCase()}` : ''}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      {domain.isPrimary ? <Badge tone="accent">primary</Badge> : null}
                      <Badge tone={domain.sslEnabled ? 'success' : 'neutral'}>
                        {domain.sslEnabled ? `ssl ${domain.sslStatus.toLowerCase()}` : 'no ssl'}
                      </Badge>
                    </div>
                  </div>

                  {records[index].length > 0 ? (
                    <div className="mt-3 rounded-md border border-rail bg-surface-2 p-3">
                      <p className="text-xs font-medium text-text-muted">
                        Point it here — at your registrar:
                      </p>
                      <ul className="mt-2 space-y-1.5">
                        {records[index].map((record, position) => (
                          <li key={position} className="font-mono text-xs text-text">
                            <span className="text-accent">{record.type}</span>{' '}
                            <span className="text-text-muted">{record.name}</span>{' '}
                            <span className="text-text-dim">→</span> {record.value}
                            {record.ttl ? (
                              <span className="text-text-dim"> · ttl {record.ttl}</span>
                            ) : null}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </Card>
      </section>

      <section>
        <SectionHeader title="Add a domain" />
        <Card>
          <ProjectAddDomainForm projectId={project.id} />
        </Card>
      </section>
    </div>
  );
}
