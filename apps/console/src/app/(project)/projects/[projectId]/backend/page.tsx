import Link from 'next/link';
import { redirect } from 'next/navigation';

import { getInstantApp, getProject } from '@/lib/api/project';
import { Card, SectionHeader } from '@/components/ui/card';
import { Page } from '@/components/ui/page';
import { Badge, EmptyState } from '@/components/ui/feedback';
import { Button } from '@/components/ui/button';

export const metadata = { title: 'Backend' };

/**
 * The project's backend.
 *
 * The data, the schema, the users, the permissions and the files live in
 * **Instant's own console**. FIDScript does not build those screens — the
 * project's page says where the console is, and stops there.
 */
export default async function ProjectBackendPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;

  const project = await getProject(projectId).catch(() => null);
  if (!project) redirect('/projects');

  const instant = await getInstantApp(project.id).catch(() => null);
  const base = `/projects/${project.slug}`;

  // The door opens on THIS project's app — Instant's dashboard takes the
  // app id as its `app` query parameter.
  const appConsoleUrl =
    instant?.dashboardUrl && instant.app
      ? `${instant.dashboardUrl.replace(/\/+$/, '')}/dash?app=${instant.app.appId}`
      : null;

  return (
    <Page
      title="Backend"
      description="Where this project's data, users and files live."
    >
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
                    Open the console
                  </Button>
                </a>
              ) : null}
            </div>
          </div>
        </Card>
      ) : (
        <Card>
          <EmptyState
            title="This project has no backend yet"
            body={
              instant?.available
                ? 'Give the project a backend in its settings, and one is created.'
                : 'The platform holds no Instant credential, so no backend can be created yet.'
            }
            action={
              <Link href={`${base}/settings`}>
                <Button variant="secondary" size="sm">
                  Open the settings
                </Button>
              </Link>
            }
          />
        </Card>
      )}

      <section>
        <SectionHeader
          title="What lives here"
          description="The console that opens is Instant's. FIDScript does not build these screens."
        />
        <Card className="p-4">
          <ul className="space-y-1.5 text-sm text-text-muted">
            <li>· The data — the tables and the rows.</li>
            <li>· The schema — what a row looks like.</li>
            <li>· The users — who exists, and how they sign in.</li>
            <li>· The permissions — who may read and who may write.</li>
            <li>· The files — the storage.</li>
          </ul>
        </Card>
      </section>
    </Page>
  );
}
