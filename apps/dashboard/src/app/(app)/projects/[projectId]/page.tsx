'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter, useSearchParams, usePathname } from 'next/navigation';

import { useAuth } from '@/contexts/auth-context';
import { DeploymentsSection } from './sections/deployments';
import { OverviewSection } from './sections/overview';
import { SettingsSection } from './sections/settings';
import { MembersSection } from './sections/members';
import { ActivityFeed } from './sections/activity';
import type { Project } from '@/types';

const SECTIONS: Record<string, React.ComponentType<{ project: Project }>> = {
  overview:    OverviewSection,
  deployments: DeploymentsSection,
  members:     MembersSection,
  settings:    SettingsSection,
  activity:    ActivityFeed,
};

export default function ProjectPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const { getSdk } = useAuth();
  const projectId = params.projectId as string;

  // Redirect /projects/:id → /projects/:id/services (the default services page).
  useEffect(() => {
    const match = pathname?.match(/\/projects\/[^/]+\/([^/]+)/);
    const pathSection = match ? match[1] : null;
    if (!searchParams.get('section') && !pathSection) {
      router.replace(`/projects/${projectId}/services`);
    }
  }, [projectId, router, searchParams, pathname]);

  const [project, setProject] = useState<Project | null>(null);

  useEffect(() => {
    getSdk().projects.get(projectId).then(setProject).catch(() => {});
  }, [projectId, getSdk]);

  // Section from path first (/projects/:id/activity → activity), then from query param.
  const pathMatch = pathname?.match(/\/projects\/[^/]+\/([^/]+)/);
  const pathSection = pathMatch ? pathMatch[1] : null;
  const section = pathSection ?? searchParams.get('section') ?? 'services';
  const SectionComponent = SECTIONS[section];

  return (
    <div className="p-6">
      {project && (
        <div className="mb-6">
          <h1 className="text-xl font-bold text-[var(--text)] mb-1">{project.name}</h1>
          <p className="text-sm text-[var(--text-muted)] capitalize">
            {project.type} · {project.status?.toLowerCase()}
          </p>
        </div>
      )}
      {SectionComponent && project
        ? <SectionComponent project={project} />
        : <p className="text-sm text-[var(--text-muted)]">Select a section from the sidebar.</p>
      }
    </div>
  );
}
