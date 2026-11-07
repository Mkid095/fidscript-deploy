import Link from 'next/link';

import { LandingNav } from '@/components/landing/landing-nav';
import { Card, SectionHeader } from '@/components/ui/card';
import { CodeBlock } from '@/components/ui/code-block';
import { getPlatformDomain } from '@/lib/api/platform';
import { APPLICATIONS } from '@/components/landing/landing-applications';

export const metadata = { title: 'Docs' };

/**
 * The documentation.
 *
 * What the platform is, what it is made of, and how to reach it — from a
 * browser, from a terminal, from a script, and from an agent.
 */
export default async function DocsPage() {
  const domain = await getPlatformDomain().catch(() => null);

  const apiUrl = domain ? `https://api.${domain}` : null;

  return (
    <div className="min-h-screen bg-canvas">
      <LandingNav />
      <main className="mx-auto max-w-3xl space-y-10 px-4 py-10">
        <header>
          <h1 className="text-xl font-semibold tracking-tight text-text">The documentation</h1>
          <p className="mt-1 text-sm text-text-muted">
            What the platform is made of, and how to reach it.
          </p>
        </header>

        <section>
          <SectionHeader
            title="The three levels"
            description="Everything is at one of these, and a screen belongs to exactly one."
          />
          <Card className="divide-y divide-rail">
            <Level
              name="Platform"
              where="/overview · /projects · /settings"
              what="What is installed, and who am I?"
            />
            <Level
              name="Project"
              where="/projects/[id]/…"
              what="What does this project do, and what does it have?"
            />
            <Level
              name="Application"
              where="/settings/applications"
              what="Is the tooling this platform relies on healthy?"
            />
          </Card>
        </section>

        <section>
          <SectionHeader
            title="The applications"
            description="Installed once, by the operator. Each one keeps its own console where it has one."
          />
          <Card className="divide-y divide-rail">
            {APPLICATIONS.map((application) => (
              <div key={application.name} className="px-4 py-3">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <p className="text-sm text-text">{application.name}</p>
                  <p className="text-xs text-text-dim">{application.treatment}</p>
                </div>
                <p className="mt-0.5 text-xs leading-relaxed text-text-muted">
                  {application.body}
                </p>
              </div>
            ))}
          </Card>
        </section>

        <section>
          <SectionHeader
            title="From a terminal"
            description="The CLI does everything the console does, and it does it from a script."
          />
          <div className="space-y-3">
            <CodeBlock
              label="Sign in, then look around"
              code={`npx @fidscript-deploy/cli login <your API key>
npx @fidscript-deploy/cli whoami
npx @fidscript-deploy/cli projects list`}
            />
            <CodeBlock
              label="The commands"
              code={`projects · deployments · domains · databases · functions
email · instant · queues · cron · storage · env · registry`}
            />
          </div>
        </section>

        <section>
          <SectionHeader
            title="From a script"
            description="The API, with a key that acts as you."
          />
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
          <SectionHeader
            title="From an agent"
            description="The MCP server, so an agent can act with your key and your scopes."
          />
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
          <SectionHeader title="Where to go next" />
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
      </main>
    </div>
  );
}

function Level({ name, where, what }: { name: string; where: string; what: string }) {
  return (
    <div className="px-4 py-3">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="text-sm font-medium text-text">{name}</p>
        <p className="font-mono text-xs text-text-dim">{where}</p>
      </div>
      <p className="mt-0.5 text-xs text-text-muted">{what}</p>
    </div>
  );
}
