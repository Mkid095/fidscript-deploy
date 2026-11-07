import { redirect } from 'next/navigation';

import { getProject } from '@/lib/api/project';
import { getFunctions } from '@/lib/api/resources';
import { Card, PageHeader } from '@/components/ui/card';
import { Badge, EmptyState } from '@/components/ui/feedback';

export const metadata = { title: 'Functions' };

/**
 * The project's functions.
 *
 * A function is a piece of code the platform runs for you — a webhook, a
 * scheduled job, a background task.
 */
export default async function ProjectFunctionsPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;

  const project = await getProject(projectId).catch(() => null);
  if (!project) redirect('/projects');

  const functions = await getFunctions(project.id).catch(() => []);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageHeader
        title="Functions"
        description={`${functions.length} in this project.`}
      />

      <Card>
        {functions.length === 0 ? (
          <EmptyState
            title="No functions yet"
            body="A function is code the platform runs for you — a webhook, a schedule, a background job."
          />
        ) : (
          <ul className="divide-y divide-rail">
            {functions.map((fn) => (
              <li key={fn.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
                <div className="min-w-0">
                  <p className="truncate text-sm text-text">{fn.name}</p>
                  <p className="mt-0.5 truncate text-xs text-text-dim">{fn.runtime ?? 'nodejs'}</p>
                </div>
                {fn.status ? (
                  <Badge tone={fn.status === 'active' ? 'success' : 'neutral'}>{fn.status}</Badge>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
