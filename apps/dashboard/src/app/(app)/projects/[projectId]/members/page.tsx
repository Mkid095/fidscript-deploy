'use client';

import { useProjectContext } from '@/contexts/project-context';
import { MembersSection } from '../sections/members';

/**
 * The project's members — who can reach it, and as what.
 *
 * This was a section of the project page (`?section=members`), which
 * nothing linked to. It is a page of its own now, with its own place in the
 * navigation.
 */
export default function ProjectMembersPage() {
  const { project } = useProjectContext();
  if (!project) return null;
  return (
    <div className="p-6">
      <MembersSection project={project} />
    </div>
  );
}
