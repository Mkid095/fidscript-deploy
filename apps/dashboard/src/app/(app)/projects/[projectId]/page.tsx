'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';

import { useAuth } from '@/contexts/auth-context';
import { DeploymentsSection } from './sections/deployments';
import { OverviewSection } from './sections/overview';
import { SettingsSection } from './sections/settings';
import { MembersSection } from './sections/members';
import type { Project } from '@/types';

const SECTIONS: Record<string, React.ComponentType<{ project: Project }>> = {
  overview:    OverviewSection,
  deployments: DeploymentsSection,
  members:     MembersSection,
  settings:    SettingsSection,
};

export default function ProjectPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { getSdk } = useAuth();
  const projectId = params.projectId as string;

  // Redirect /projects/:id → /projects/:id?section=deployments if no section param.
  useEffect(() => {
    if (!searchParams.get('section')) {
      router.replace(`/projects/${projectId}?section=deployments`);
    }
  }, [projectId, router, searchParams]);

  const [project, setProject] = useState<Project | null>(null);

  useEffect(() => {
    getSdk().projects.get(projectId).then(setProject).catch(() => {});
  }, [projectId, getSdk]);

  const section = searchParams.get('section') ?? 'deployments';
  const SectionComponent = SECTIONS[section];

  return (
    <div className="p-6">
      {project && (
        <div className="mb-6">
          <h1 className="text-xl font-bold text-slate-200 mb-1">{project.name}</h1>
          <p className="text-sm text-slate-500 capitalize">
            {project.type} · {project.status?.toLowerCase()}
          </p>
        </div>
      )}
      {SectionComponent && project
        ? <SectionComponent project={project} />
        : <p className="text-sm text-slate-500">Select a section from the sidebar.</p>
      }
    </div>
  );
}
