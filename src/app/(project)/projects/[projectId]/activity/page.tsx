import { redirect } from 'next/navigation';

import { getProject } from '@/lib/api/project';
import { getProjectEvents } from '@/lib/api/resources';
import { Card, PageHeader } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/feedback';

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
    <div className="mx-auto max-w-3xl space-y-6">
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
                <p className="text-sm text-text">{describe(event.type)}</p>
                <p className="mt-0.5 text-xs text-text-dim">{when(event.createdAt)}</p>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}

/** The event's type, said in words. */
function describe(type: string): string {
  const known: Record<string, string> = {
    'projects.created': 'The project was created.',
    'projects.updated': 'The project was changed.',
    'projects.deleted': 'The project was deleted.',
    'projects.archived': 'The project was archived.',
    'projects.invitation.created': 'An invitation was made.',
    'projects.invitation.accepted': 'An invitation was accepted.',
    'projects.invitation.revoked': 'An invitation was withdrawn.',
    'projects.member.added': 'Somebody was added to the project.',
    'projects.member.removed': 'Somebody was removed from the project.',
    'projects.env_var.updated': 'The environment variables were changed.',
    'projects.env_var.deleted': 'An environment variable was removed.',
  };
  return known[type] ?? type;
}

function when(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toISOString().replace('T', ' ').slice(0, 16) + ' UTC';
}
