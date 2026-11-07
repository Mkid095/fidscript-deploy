import Link from 'next/link';

import { LandingNav } from '@/components/landing/landing-nav';
import { Card } from '@/components/ui/card';
import { CodeBlock } from '@/components/ui/code-block';
import { DOC_GROUPS, DOC_PAGES } from '@/content/docs';
import { getPlatformDomain } from '@/lib/api/platform';

export const metadata = { title: 'The guide · FIDScript' };

/**
 * The guide.
 *
 * What the platform is made of, and how to reach it — from a browser, from
 * a terminal, from a script, and from an agent.
 */
export default async function DocsPage() {
  const domain = await getPlatformDomain().catch(() => null);
  const apiUrl = domain ? `https://api.${domain}` : null;

  return (
    <div className="min-h-screen bg-canvas">
      <LandingNav />
      <main className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
        <header className="max-w-2xl">
          <h1 className="text-2xl font-semibold tracking-tight text-text">The guide</h1>
          <p className="mt-2 text-sm leading-relaxed text-text-muted">
            What the platform is made of, and how to reach it. Every path here leads to a page
            that exists.
          </p>
        </header>

        <div className="mt-10 grid grid-cols-1 gap-10 lg:grid-cols-[220px_minmax(0,1fr)]">
          <nav aria-label="The guide">
            {DOC_GROUPS.map((group) => {
              const pages = DOC_PAGES.filter((candidate) => candidate.group === group);
              if (pages.length === 0) return null;
              return (
                <div key={group} className="mb-5 last:mb-0">
                  <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-text-dim">
                    {group}
                  </p>
                  <ul className="space-y-0.5">
                    {pages.map((candidate) => (
                      <li key={candidate.slug}>
                        <Link
                          href={`/docs/${candidate.slug}`}
                          className="block rounded-md px-2 py-1 text-sm text-text-muted transition-colors hover:bg-surface-2 hover:text-text"
                        >
                          {candidate.title}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </nav>

          <div className="min-w-0 max-w-3xl space-y-10">
            <section>
              <h2 className="mb-3 text-base font-semibold text-text">From a terminal</h2>
              <p className="mb-3 text-sm leading-relaxed text-text-muted">
                The command line does everything the console does, and it does it from a script.
              </p>
              <CodeBlock
                label="Sign in, then look around"
                code={`npx @fidscript-deploy/cli login <your API key>
npx @fidscript-deploy/cli whoami
npx @fidscript-deploy/cli projects list`}
              />
            </section>

            <section>
              <h2 className="mb-3 text-base font-semibold text-text">From a script</h2>
              <p className="mb-3 text-sm leading-relaxed text-text-muted">
                The API, with a key that acts as you.
              </p>
              <div className="space-y-3">
                {apiUrl ? (
                  <CodeBlock
                    label="The API"
                    code={`${apiUrl}/api/v1

Authorization: Bearer <your API key>`}
                  />
                ) : null}
                <CodeBlock
                  label="The SDK"
                  code={`import { createFidscript } from '@fidscript-deploy/sdk';

const fs = createFidscript({
  baseURL: '${apiUrl ?? 'https://api.example.com'}',
  apiKey: process.env.FIDSCRIPT_API_KEY,
});

const projects = await fs.projects.list();`}
                />
              </div>
            </section>

            <section>
              <h2 className="mb-3 text-base font-semibold text-text">From an agent</h2>
              <p className="mb-3 text-sm leading-relaxed text-text-muted">
                The MCP server, so an agent can act with your key and your scopes.
              </p>
              <CodeBlock
                label="MCP"
                code={JSON.stringify(
                  {
                    mcpServers: {
                      fidscript: {
                        command: 'npx',
                        args: ['-y', '@fidscript-deploy/mcp-server'],
                        env: {
                          FIDSCRIPT_API_KEY: '<your API key>',
                          FIDSCRIPT_API_URL: apiUrl ?? 'https://api.example.com',
                        },
                      },
                    },
                  },
                  null,
                  2,
                )}
              />
            </section>

            <section>
              <h2 className="mb-3 text-base font-semibold text-text">Where to go next</h2>
              <Card className="p-4">
                <p className="text-sm text-text-muted">
                  <Link href="/projects" className="text-accent hover:underline">
                    Your projects
                  </Link>{' '}
                  ·{' '}
                  <Link href="/settings/api-keys" className="text-accent hover:underline">
                    An API key
                  </Link>{' '}
                  ·{' '}
                  <Link href="/settings/applications" className="text-accent hover:underline">
                    The applications
                  </Link>
                </p>
              </Card>
            </section>
          </div>
        </div>
      </main>
    </div>
  );
}
