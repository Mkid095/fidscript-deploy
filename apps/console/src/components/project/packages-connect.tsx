import { Card, SectionHeader } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/feedback';
import { CodeBlock } from '@/components/ui/code-block';

/**
 * Connecting to the registry, and publishing to it.
 *
 * The snippets are the ones the tools actually read: the `.npmrc` npm
 * reads, the `settings.xml` Maven reads, the `repositories` block Gradle
 * reads. They are filled in with the registry's real address.
 */
export function PackagesConnect({
  registryUrl,
}: {
  registryUrl: string | null;
}) {
  if (!registryUrl) {
    return (
      <section>
        <SectionHeader title="Connect" />
        <Card>
          <EmptyState
            title="No registry address"
            body="The platform did not answer with the domain its services run on."
          />
        </Card>
      </section>
    );
  }

  // The scope the registry knows. A scope of the project's own is not
  // configured on this deployment, and the console does not invent one.
  const scope = '@fidscript-deploy';
  const host = registryUrl.replace('https://', '');
  const npmrc = `${scope}:registry=${registryUrl}\n//${host}/:_authToken=\${NPM_TOKEN}`;

  return (
    <>
      <section>
        <SectionHeader
          title="Connect"
          description="What an application writes so it can publish, and so it can install."
        />
        <div className="space-y-3">
          <CodeBlock label=".npmrc" code={npmrc} />
          <CodeBlock
            label="Maven — settings.xml"
            code={`<repositories>\n  <repository>\n    <id>fidscript</id>\n    <url>${registryUrl}/maven</url>\n  </repository>\n</repositories>`}
          />
          <CodeBlock
            label="Gradle — build.gradle"
            code={`repositories {\n  maven { url "${registryUrl}/maven" }\n}`}
          />
        </div>
      </section>

      <section>
        <SectionHeader
          title="Publish"
          description="How a package leaves this machine."
        />
        <Card className="p-4">
          <ol className="space-y-2 text-sm text-text-muted">
            <li>
              <span className="text-text">1.</span> Sign in to the registry —{' '}
              <code className="font-mono text-xs text-text">
                npm login --registry {registryUrl}
              </code>
            </li>
            <li>
              <span className="text-text">2.</span> Point the scope at it, in
              the package&apos;s own{' '}
              <code className="font-mono text-xs text-text">.npmrc</code>.
            </li>
            <li>
              <span className="text-text">3.</span> Publish it —{' '}
              <code className="font-mono text-xs text-text">npm publish</code>
            </li>
          </ol>
          <p className="mt-4 text-xs leading-relaxed text-text-dim">
            A scope of this project&apos;s own is not configured on this
            deployment — the registry knows{' '}
            <code className="font-mono">{scope}</code> and the packages under
            it.
          </p>
        </Card>
      </section>
    </>
  );
}
