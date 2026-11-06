'use client';

import { useProjectContext } from '@/contexts/project-context';
import { SettingsSection } from '../sections/settings';

/**
 * The project's settings — its build configuration, its environment and
 * its danger zone.
 *
 * This used to redirect to `?section=settings` — a second way of asking for
 * the same screen. It is a page of its own now.
 */
export default function ProjectSettingsPage() {
  const { project } = useProjectContext();
  if (!project) return null;
  return (
    <div className="p-6">
      <SettingsSection project={project} />
    </div>
  );
}
