'use client';

import { useProjectContext } from '@/contexts/project-context';
import { OverviewSection } from '../sections/overview';

/**
 * The project's overview — its size, its members, when it was last
 * deployed and when it was created.
 */
export default function ProjectOverviewPage() {
  const { project } = useProjectContext();
  if (!project) return null;
  return (
    <div className="p-6">
      <OverviewSection project={project} />
    </div>
  );
}
