'use client';

import { useEffect, useState } from 'react';
import { Card, Spinner } from '@fidscript/ui';

import { useAuth } from '@/contexts/auth-context';
import type { Project, EnvVar, ProjectMember } from '@/types';

interface Props { project: Project }

export function OverviewSection({ project }: Props) {
  const { getSdk } = useAuth();
  const [envVars, setEnvVars] = useState<EnvVar[]>([]);
  const [members, setMembers] = useState<ProjectMember[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const sdk = getSdk();
      const [envRes, membersRes] = await Promise.allSettled([
        sdk.projects.getEnvVars(project.id),
        sdk.projects.listMembers(project.id),
      ]);
      if (!cancelled) {
        if (envRes.status === 'fulfilled') setEnvVars(envRes.value);
        if (membersRes.status === 'fulfilled') setMembers(Array.isArray(membersRes.value) ? membersRes.value : []);
        setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [project.id, getSdk]);

  if (loading) return <Spinner size="md" />;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <Card className="border border-[#1e2130]">
        <p className="text-xs text-slate-500 mb-2">Env Variables</p>
        <p className="text-3xl font-bold text-slate-200">{envVars.length}</p>
      </Card>
      <Card className="border border-[#1e2130]">
        <p className="text-xs text-slate-500 mb-2">Members</p>
        <p className="text-3xl font-bold text-slate-200">{members.length}</p>
      </Card>
      <Card className="border border-[#1e2130]">
        <p className="text-xs text-slate-500 mb-2">Last Deploy</p>
        <p className="text-sm font-medium text-slate-200">
          {project.lastDeployAt
            ? new Date(project.lastDeployAt).toLocaleDateString()
            : 'Never'}
        </p>
      </Card>
      <Card className="border border-[#1e2130]">
        <p className="text-xs text-slate-500 mb-2">Created</p>
        <p className="text-sm font-medium text-slate-200">
          {new Date(project.createdAt).toLocaleDateString()}
        </p>
      </Card>
    </div>
  );
}
