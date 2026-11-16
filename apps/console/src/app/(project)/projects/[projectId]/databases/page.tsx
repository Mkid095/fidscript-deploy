import Link from 'next/link';
import { redirect } from 'next/navigation';

import { Page } from '@/components/ui/page';

import { getInstantApp, getProject } from '@/lib/api/project';
import { getDatabases } from '@/lib/api/resources';
import { Card, SectionHeader } from '@/components/ui/card';
import { Badge, EmptyState } from '@/components/ui/feedback';
import { Button } from '@/components/ui/button';

export const metadata = { title: 'Databases' };

/**
 * The project's databases.
 *
 * Two things hold this project's data, and this page is the way to both:
 *
 * - the project's **Instant app** — its data, its schema, its console —
 *   linked straight into Instant's own console with the app id in the link,
 *   so it opens on _this_ project's app and not on a list;
 * - a managed Postgres, when the project needs a raw connection.
 */
export default async function ProjectDatabasesPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;

  const project = await getProject(projectId).catch(() => null);
  if (!project) redirect('/projects');

  const [databases, instant] = await Promise.all([
    getDatabases(project.id).catch(() => []),
    getInstantApp(project.id).catch(() => null),
  ]);

  // The door into Instant's console, opened on THIS project's app. Instant's
  // own dashboard takes the app id as its `app` query parameter.
  const appConsoleUrl =
    instant?.dashboardUrl && instant.app
      ? `${instant.dashboardUrl.replace(/\/+$/, '')}/dash?app=${instant.app.appId}`
      : null;
  const backendConsoleUrl = instant?.dashboardUrl
    ? `${instant.dashboardUrl.replace(/\/+$/, '')}/dash`
    : null;

  return (
    <Page
      title="Databases"
      description="Where this project's data lives, and the doors to it."
    >
      <section>
        <SectionHeader
          title="The backend — the project's data plane"
          description="The tables, the schema, the users and the files. They live in Instant's own console."
        />
        {instant?.app ? (
          <Card className="p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm font-medium text-text">
                  {instant.app.title}
                </p>
                <p className="mt-0.5 font-mono text-xs text-text-dim">
                  {instant.app.appId}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Badge tone="success">{instant.app.status}</Badge>
                {appConsoleUrl ? (
                  <a href={appConsoleUrl} target="_blank" rel="noreferrer">
                    <Button variant="primary" size="sm">
                      Open this app in Instant
                    </Button>
                  </a>
                ) : null}
              </div>
            </div>
            <p className="mt-3 text-xs leading-relaxed text-text-muted">
              The data, the schema, the permissions and the users are
              Instant&apos;s own screens — the platform does not build a second
              copy of them.
            </p>
          </Card>
        ) : instant?.available ? (
          <Card>
            <EmptyState
              title="No backend yet"
              body="Give the project a backend in its settings, and its Instant app is created."
              action={
                <Link href={`/projects/${project.slug}/settings`}>
                  <Button variant="secondary" size="sm">
                    Open the settings
                  </Button>
                </Link>
              }
            />
          </Card>
        ) : (
          <Card>
            <EmptyState
              title="The platform holds no Instant credential"
              body="No backend can be created until the platform holds its Instant token. The operator fixes this in the installer's secrets."
            />
          </Card>
        )}
        {backendConsoleUrl && instant?.app ? (
          <p className="mt-2 text-xs text-text-muted">
            The whole backend-as-a-service console — every application, settings
            and backups — is{' '}
            <a
              href={backendConsoleUrl}
              target="_blank"
              rel="noreferrer"
              className="text-accent hover:underline"
            >
              {backendConsoleUrl.replace(/^https?:\/\//, '')}
            </a>
            .
          </p>
        ) : null}
      </section>

      <section>
        <SectionHeader
          title="Managed Postgres"
          description="A raw connection, when the project needs one."
        />
        <Card>
          {databases.length === 0 ? (
            <EmptyState
              title="No database yet"
              body="A managed Postgres is created for the project when it needs one."
            />
          ) : (
            <ul className="divide-y divide-rail">
              {databases.map((database) => (
                <li key={database.id} className="px-4 py-3">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm text-text">
                        {database.name}
                      </p>
                      <p className="mt-0.5 truncate text-xs text-text-dim">
                        {database.type} {database.version} ·{' '}
                        {database.environment} · {database.size}
                      </p>
                    </div>
                    <Badge
                      tone={database.status === 'ready' ? 'success' : 'warning'}
                    >
                      {database.status}
                    </Badge>
                  </div>
                  <p className="mt-2 font-mono text-xs text-text-dim">
                    {database.username}@{database.host}:{database.port}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </section>
    </Page>
  );
}
