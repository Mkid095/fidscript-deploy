import Link from 'next/link';

import { getGithubConnection } from '@/lib/api/integrations';
import { listProjects } from '@/lib/api/projects';
import { getDnsConnection } from '@/lib/api/domains';
import { Card, PageHeader, SectionHeader } from '@/components/ui/card';
import { Page } from '@/components/ui/page';
import { Badge, EmptyState } from '@/components/ui/feedback';
import { SettingsNav } from '@/components/platform/settings-nav';
import { GithubConnection } from '@/components/platform/github-connection';

export const metadata = { title: 'Integrations · Settings' };

/**
 * The accounts the platform holds.
 *
 * A GitHub account is the person's — it is used by every deployment they
 * make. A Cloudflare account belongs to a project, because it is that
 * project's domains it writes the records for.
 */
export default async function IntegrationsSettingsPage() {
  const [github, projects] = await Promise.all([
    getGithubConnection(),
    listProjects().catch(() => []),
  ]);

  const dns = await Promise.all(
    projects.map(async (project) => ({
      project,
      connection: await getDnsConnection(project.id),
    })),
  );

  return (
    <Page>
      <PageHeader
        title="Integrations"
        description="The accounts the platform holds for you — kept privately, and used for you."
      />
      <SettingsNav />

      <section>
        <SectionHeader
          title="GitHub"
          description="Where your code lives, and where the deployments come from."
        />
        <GithubConnection
          connected={github.connected}
          username={github.username}
          avatarUrl={github.avatarUrl}
          scopes={github.scopes}
        />
      </section>

      <section>
        <SectionHeader
          title="Cloudflare"
          description="The account that holds your domains — one per project, because it writes that project's records."
        />
        <Card>
          {projects.length === 0 ? (
            <EmptyState title="No projects yet" body="A project's domains are connected from the project itself." />
          ) : (
            <ul className="divide-y divide-rail">
              {dns.map((entry) => (
                <li key={entry.project.id} className="flex items-center justify-between gap-4 px-4 py-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm text-text">{entry.project.name}</p>
                    <p className="truncate text-xs text-text-dim">
                      {entry.connection
                        ? entry.connection.email
                          ? `${entry.connection.email} · connected`
                          : 'Connected — the domains are written by the platform'
                        : 'Not connected — the domains are set by hand'}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    {entry.connection ? (
                      <Badge tone="success">connected</Badge>
                    ) : (
                      <Badge tone="neutral">not connected</Badge>
                    )}
                    <Link
                      href={`/projects/${entry.project.slug}/domains`}
                      className="text-xs text-accent hover:underline"
                    >
                      {entry.connection ? 'Open' : 'Connect'}
                    </Link>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </section>
    </Page>
  );
}
