import { redirect } from 'next/navigation';

import { Page } from '@/components/ui/page';

import { getProject } from '@/lib/api/project';
import { getProjectEvents } from '@/lib/api/resources';
import { Card, PageHeader } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/feedback';
import { sayEvent, sayWhen } from '@/lib/events';

export const metadata = { title: 'Activity' };

/**
 * What has happened in this project.
 *
 * The feed the API keeps — every change in here was made by somebody.
 */
export default async function ProjectActivityPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;

  const project = await getProject(projectId).catch(() => null);
  if (!project) redirect('/projects');

  const events = await getProjectEvents(project.id).catch(() => []);

  return (
    <Page>
      <PageHeader title="Activity" description="Everything that has happened here." />

      <Card>
        {events.length === 0 ? (
          <EmptyState
            title="Nothing has happened yet"
            body="Every change in this project will show up here."
          />
        ) : (
          <ul className="divide-y divide-rail">
            {events.map((event) => (
              <li key={event.id} className="px-4 py-3">
                <p className="text-sm text-text">{sayEvent(event.type)}</p>
                <p className="mt-0.5 text-xs text-text-dim">{sayWhen(event.createdAt)}</p>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </Page>
  );
}
