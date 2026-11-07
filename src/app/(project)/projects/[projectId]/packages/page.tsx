import { redirect } from 'next/navigation';

import { getProject } from '@/lib/api/project';
import { getPublishedPackages, getRegistryUrl } from '@/lib/api/packages';
import { Card, PageHeader, SectionHeader } from '@/components/ui/card';
import { Badge, EmptyState } from '@/components/ui/feedback';
import { PackagesConnect } from '@/components/project/packages-connect';

export const metadata = { title: 'Packages' };

/**
 * The project's packages.
 *
 * The registry is the platform's, and it answers the same way to everybody.
 * What this screen gives is the address, the way to publish to it, and what
 * is published in it already.
 */
export default async function ProjectPackagesPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;

  const project = await getProject(projectId).catch(() => null);
  if (!project) redirect('/projects');

  const registryUrl = await getRegistryUrl();
  const { packages, reachable } = registryUrl
    ? await getPublishedPackages(registryUrl)
    : { packages: [], reachable: false };

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <PageHeader
        title="Packages"
        description="Publish a package, and use the ones that are published."
      />

      <section>
        <SectionHeader title="The registry" />
        <Card className="divide-y divide-rail">
          <Row term="npm" value={registryUrl ?? 'The platform domain is not known'} />
          <Row term="Maven" value="Not served by this deployment" />
          <Row
            term="Reachability"
            value={reachable ? 'The registry answers' : 'The registry did not answer'}
          />
        </Card>
      </section>

      <PackagesConnect registryUrl={registryUrl} />

      <section>
        <SectionHeader title="Published" description="What the registry holds right now." />
        <Card>
          {packages.length === 0 ? (
            <EmptyState
              title="Nothing is published"
              body="The registry answers with what it holds — including the packages published to it."
            />
          ) : (
            <ul className="divide-y divide-rail">
              {packages.slice(0, 40).map((entry) => (
                <li key={entry.name} className="flex items-center justify-between gap-4 px-4 py-3">
                  <div className="min-w-0">
                    <p className="truncate font-mono text-sm text-text">{entry.name}</p>
                    {entry.description ? (
                      <p className="truncate text-xs text-text-dim">{entry.description}</p>
                    ) : null}
                  </div>
                  <Badge tone="neutral">{entry.latest ?? 'no version'}</Badge>
                </li>
              ))}
            </ul>
          )}
        </Card>
        {packages.length > 40 ? (
          <p className="mt-2 text-xs text-text-dim">
            Showing 40 of {packages.length}. The registry holds the rest.
          </p>
        ) : null}
      </section>
    </div>
  );
}

function Row({ term, value }: { term: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 px-4 py-2.5">
      <span className="text-sm text-text-muted">{term}</span>
      <span className="truncate text-sm text-text">{value}</span>
    </div>
  );
}
