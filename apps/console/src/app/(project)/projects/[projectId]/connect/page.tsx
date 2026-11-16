import Link from 'next/link';
import { redirect } from 'next/navigation';

import { getInstantConfig, getProject } from '@/lib/api/project';
import { Card, SectionHeader } from '@/components/ui/card';
import { Page } from '@/components/ui/page';
import { EmptyState } from '@/components/ui/feedback';
import { Button } from '@/components/ui/button';
import { CodeBlock } from '@/components/ui/code-block';

export const metadata = { title: 'Connect' };

/**
 * Connecting an application to this project.
 *
 * What is here is what the API actually hands out: the app's id, the
 * environment the application needs, the commands that do the same thing
 * from a terminal, and the MCP configuration for an agent.
 */
export default async function ProjectConnectPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;

  const project = await getProject(projectId).catch(() => null);
  if (!project) redirect('/projects');

  const config = await getInstantConfig(project.id);
  const base = `/projects/${project.slug}`;

  const environment = config
    ? {
        INSTANT_APP_ID: config.appId,
        INSTANT_API_URI: config.apiHost,
        INSTANT_WS_URI: `${config.apiHost.replace(/^http/, 'ws')}/runtime/session`,
        INSTANT_STORAGE_URI: config.apiHost,
        INSTANT_DASH_URI: config.dashboardUrl,
      }
    : null;

  const cli = `npx @fidscript-deploy/cli instant config -p ${project.id}`;
  const mcp = JSON.stringify(
    {
      mcpServers: {
        fidscript: {
          command: 'npx',
          args: ['-y', '@fidscript-deploy/mcp-server'],
          env: {
            FIDSCRIPT_API_KEY: '<your API key>',
            FIDSCRIPT_API_URL: 'https://api.fidscript.com',
          },
        },
      },
    },
    null,
    2,
  );

  return (
    <Page
      title="Connect an application"
      description="What an application needs to talk to this project."
    >
      {!config ? (
        <Card>
          <EmptyState
            title="There is nothing to connect to yet"
            body="This project has no application backend. Give it one in the settings and the details appear here."
            action={
              <Link href={`${base}/settings`}>
                <Button variant="secondary" size="sm">
                  Open the settings
                </Button>
              </Link>
            }
          />
        </Card>
      ) : (
        <section>
          <SectionHeader
            title="The environment"
            description="Add these to the application. They are the same names the Instant SDK reads."
          />
          <Card className="p-4">
            <CodeBlock
              label="Environment"
              code={Object.entries(environment!)
                .map(([key, value]) => `${key}=${value}`)
                .join('\n')}
            />
          </Card>
        </section>
      )}

      <section>
        <SectionHeader
          title="From a terminal"
          description="The CLI reads the same configuration."
        />
        <CodeBlock label="Command" code={cli} />
      </section>

      <section>
        <SectionHeader
          title="From an agent"
          description="The MCP server, with a key that is allowed to act on your behalf."
        />
        <CodeBlock label="MCP" code={mcp} />
      </section>
    </Page>
  );
}
