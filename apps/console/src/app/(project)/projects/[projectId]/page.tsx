import { redirect } from 'next/navigation';

/**
 * The project's front door.
 *
 * It sends the person to the project's **overview** — never to a section.
 * A project opens on what it is, what it has and what to do next.
 */
export default async function ProjectPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  redirect(`/projects/${projectId}/overview`);
}
