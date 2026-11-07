import { redirect } from 'next/navigation';

import { Page } from '@/components/ui/page';

import { getProject } from '@/lib/api/project';
import { getDatabases } from '@/lib/api/resources';
import { Card } from '@/components/ui/card';
import { Badge, EmptyState } from '@/components/ui/feedback';

export const metadata = { title: 'Databases' };

/**
 * The project's databases.
 *
 * A managed Postgres, with the connection the platform gives the
 * application's environment.
 */
export default async function ProjectDatabasesPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;

  const project = await getProject(projectId).catch(() => null);
  if (!project) redirect('/projects');

  const databases = await getDatabases(project.id).catch(() => []);

  return (
    <Page
      title="Databases"
      description={`${databases.length} in this project.`}
    >
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
    </Page>
  );
}
