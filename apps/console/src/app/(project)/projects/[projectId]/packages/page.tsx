import { redirect } from 'next/navigation';

import { getProject } from '@/lib/api/project';
import {
  getPublishedPackages,
  getRegistryPackage,
  getRegistryUrl,
} from '@/lib/api/packages';
import { getPlatformDomain } from '@/lib/api/platform';
import { Page } from '@/components/ui/page';
import { PageHeader } from '@/components/ui/card';
import { PackagesRegistry } from '@/components/project/packages-registry';
import { Card } from '@/components/ui/card';

export const metadata = { title: 'Packages' };

/**
 * The project's packages.
 *
 * The registry is the platform's, and it answers the same way to everybody.
 * This screen gives the address, the way to publish to it, and what is
 * published in it already.
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
  const domain = await getPlatformDomain().catch(() => null);
  const mavenUrl = domain ? `https://maven.${domain}` : null;
  const { packages, reachable } = registryUrl
    ? await getPublishedPackages(registryUrl)
    : { packages: [], reachable: false };

  // What the registry knows about the packages under the platform's scope.
  const scope = '@fidscript-deploy';
  const inScope = packages.filter((entry) => entry.name.startsWith(scope));
  const details: Record<string, Awaited<ReturnType<typeof getRegistryPackage>>> = {};
  if (registryUrl) {
    for (const entry of inScope.slice(0, 12)) {
      details[entry.name] = await getRegistryPackage(registryUrl, entry.name);
    }
  }

  return (
    <Page>
      <PageHeader
        title="Packages"
        description="Publish a package, and use the ones that are published."
      />

      <PackagesRegistry
        registryUrl={registryUrl}
        mavenUrl={mavenUrl}
        packages={packages}
        reachable={reachable}
        scope={scope}
        details={details}
      />

      <section>
        <PageHeader
          title="Publish"
          description="How a package leaves this machine."
        />
        <Card className="p-4">
          <ol className="space-y-2 text-sm text-text-muted">
            <li>
              <span className="text-text">1.</span> Sign in to the registry —{' '}
              <code className="font-mono text-xs text-text">
                npm login --registry {registryUrl ?? 'https://registry.example.com'}
              </code>
            </li>
            <li>
              <span className="text-text">2.</span> Point the scope at it, in the package&apos;s
              own <code className="font-mono text-xs text-text">.npmrc</code>.
            </li>
            <li>
              <span className="text-text">3.</span> Publish it —{' '}
              <code className="font-mono text-xs text-text">npm publish</code>
            </li>
          </ol>
          <p className="mt-4 text-xs leading-relaxed text-text-dim">
            The token is read from the environment — <code className="font-mono">NPM_TOKEN</code> or{' '}
            <code className="font-mono">FIDScript_REGISTRY_TOKEN</code> — so a CI job publishes
            without ever holding it in a file.
          </p>
        </Card>
      </section>
    </Page>
  );
}
