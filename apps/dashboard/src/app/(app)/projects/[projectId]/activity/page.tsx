'use client';

import { useProjectContext } from '@/contexts/project-context';
import { ActivityFeed } from '../sections/activity';

/**
 * The project's activity — what happened in it, lately.
 *
 * This was a section of the project page (`?section=activity`), which
 * nothing linked to. It is a page of its own now.
 */
export default function ProjectActivityPage() {
  const { project } = useProjectContext();
  if (!project) return null;
  return (
    <div className="p-6">
      <ActivityFeed project={project} />
    </div>
  );
}
