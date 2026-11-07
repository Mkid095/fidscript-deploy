import { Card, SectionHeader } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/feedback';
import { CodeBlock } from '@/components/ui/code-block';
import type { RegistryPackage } from '@/lib/api/packages';
import { PackageRow } from '@/components/project/package-row';

/**
 * The registry.
 *
 * The address, the packages that are published in it, and the three ways to
 * reach it: npm, Maven and Gradle. Every snippet is filled in with the
 * registry's real address.
 */
export interface PackageDetail {
  name: string;
  description?: string;
  latest?: string;
  tags: Record<string, string>;
  versions: string[];
  readme?: string;
}

export function PackagesRegistry({
  registryUrl,
  mavenUrl,
  packages,
  reachable,
  scope,
  details,
}: {
  registryUrl: string | null;
  /** The Maven repository — the Kotlin and Android SDKs. */
  mavenUrl: string | null;
  packages: RegistryPackage[];
  reachable: boolean;
  scope: string;
  /** What the registry knows about each of the packages shown. */
  details: Record<string, PackageDetail | null>;
}) {
  const inScope = packages.filter((entry) => entry.name.startsWith(scope));
  const shown = inScope.length > 0 ? inScope : packages.slice(0, 12);

  return (
    <>
      <section>
        <SectionHeader
          title="The registry"
          description="A private registry, so your packages have a home that does not depend on a public one."
        />
        <Card className="divide-y divide-rail">
          <Row term="npm" value={registryUrl ?? 'The platform domain is not known'} />
          <Row term="Maven" value={mavenUrl ?? 'Not served by this deployment'} />
          <Row
            term="Reachability"
            value={reachable ? 'The registry answers' : 'The registry did not answer'}
          />
          <Row term="Packages" value={String(packages.length)} />
        </Card>
      </section>

      <section>
        <SectionHeader
          title="Connect"
          description="What an application writes so it can publish, and so it can install."
        />
        {registryUrl ? (
          <div className="space-y-3">
            <CodeBlock
              label=".npmrc"
              code={`${scope}:registry=${registryUrl}\n//${registryUrl.replace('https://', '')}/:_authToken=\${NPM_TOKEN}`}
            />
            <CodeBlock
              label="Maven — settings.xml"
              code={`<repositories>\n  <repository>\n    <id>fidscript</id>\n    <url>${registryUrl}/maven</url>\n  </repository>\n</repositories>`}
            />
            <CodeBlock
              label="Gradle — build.gradle"
              code={`repositories {\n  maven { url "${registryUrl}/maven" }\n}`}
            />
          </div>
        ) : (
          <Card>
            <EmptyState
              title="No registry address"
              body="The platform did not answer with the domain its services run on."
            />
          </Card>
        )}
      </section>

      <section>
        <SectionHeader
          title="Published"
          description="What the registry holds right now."
        />
        <Card>
          {shown.length === 0 ? (
            <EmptyState
              title="Nothing is published"
              body="The registry answers with what it holds — including the packages published to it."
            />
          ) : (
            <ul className="divide-y divide-rail">
              {shown.map((entry) => (
                <PackageRow key={entry.name} entry={entry} detail={details[entry.name] ?? null} />
              ))}
            </ul>
          )}
        </Card>
        {packages.length > shown.length ? (
          <p className="mt-2 text-xs text-text-dim">
            Showing {shown.length} of {packages.length}. The registry holds the rest.
          </p>
        ) : null}
      </section>
    </>
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
