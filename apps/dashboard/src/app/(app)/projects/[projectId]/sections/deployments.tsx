'use client';

import { useEffect, useState } from 'react';
import { Card, Spinner, EmptyState, Button } from '@fidscript/ui';

import { useAuth } from '@/contexts/auth-context';
import type { Project, Deployment } from '@/types';

interface Props { project: Project }

export function DeploymentsSection({ project }: Props) {
  const { getSdk } = useAuth();
  const [deployments, setDeployments] = useState<Deployment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const data = await getSdk().deployments.list(project.id);
        if (!cancelled) setDeployments(Array.isArray(data) ? data : (data as any).deployments ?? []);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [project.id, getSdk]);

  if (loading) return <Spinner size="md" />;
  if (error) return <p className="text-red-400 text-sm">{error}</p>;

  if (deployments.length === 0) {
    return (
      <EmptyState
        title="No deployments yet"
        description="Connect a Git repository to deploy your first release."
        action={
          <Button variant="primary" size="sm">New Deployment</Button>
        }
      />
    );
  }

  return (
    <div className="flex flex-col gap-2">
      {deployments.map(dep => (
        <Card key={dep.id} className="border border-[#1e2130] py-3 px-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-slate-200">
                {dep.version ?? dep.id}
              </p>
              <p className="text-xs text-slate-500">
                {new Date(dep.createdAt).toLocaleDateString()}
              </p>
            </div>
            <span className={`text-xs px-2 py-0.5 rounded-full capitalize ${
              dep.status === 'SUCCESS'
                ? 'bg-emerald-900/60 text-emerald-400 border border-emerald-800'
                : dep.status === 'FAILED'
                  ? 'bg-red-900/60 text-red-400 border border-red-800'
                  : 'bg-[#1e2130] text-slate-400 border border-[#2a2d3a]'
            }`}>
              {dep.status?.toLowerCase()}
            </span>
          </div>
          {dep.deploymentUrl && (
            <a
              href={dep.deploymentUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-blue-500 hover:text-blue-400 mt-1 block"
            >
              {dep.deploymentUrl}
            </a>
          )}
        </Card>
      ))}
    </div>
  );
}
