'use client';

import { Card, Spinner } from '@fidscript/ui';

import type { Project } from '@/types';
import { useAuth } from '@/contexts/auth-context';
import { useProjectOverviewData } from './use-project-overview-data';

interface Props { project: Project }

export function OverviewSection({ project }: Props) {
  const { getSdk } = useAuth();
  const { envVars, members, loading } = useProjectOverviewData({ projectId: project.id, getSdk });

  if (loading) return <Spinner size="md" />;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <Card className="border border-[var(--rail)]">
        <p className="text-xs text-[var(--text-muted)] mb-2">Env Variables</p>
        <p className="text-3xl font-bold text-[var(--text)]">{envVars.length}</p>
      </Card>
      <Card className="border border-[var(--rail)]">
        <p className="text-xs text-[var(--text-muted)] mb-2">Members</p>
        <p className="text-3xl font-bold text-[var(--text)]">{members.length}</p>
      </Card>
      <Card className="border border-[var(--rail)]">
        <p className="text-xs text-[var(--text-muted)] mb-2">Last Deploy</p>
        <p className="text-sm font-medium text-[var(--text)]">
          {project.lastDeployAt
            ? new Date(project.lastDeployAt).toLocaleDateString()
            : 'Never'}
        </p>
      </Card>
      <Card className="border border-[var(--rail)]">
        <p className="text-xs text-[var(--text-muted)] mb-2">Created</p>
        <p className="text-sm font-medium text-[var(--text)]">
          {new Date(project.createdAt).toLocaleDateString()}
        </p>
      </Card>
    </div>
  );
}
