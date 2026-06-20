'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { createFidscript } from '@fidscript/sdk';
import { Card } from '@fidscript/ui';
import { Button } from '@fidscript/ui';
import { Spinner } from '@fidscript/ui';
import { EmptyState } from '@fidscript/ui';

import type { Project, Deployment } from '@/types';

const STATUS_COLORS: Record<string, string> = {
  PENDING: 'bg-slate-700 text-slate-300',
  QUEUED: 'bg-yellow-900 text-yellow-400',
  BUILDING: 'bg-blue-900 text-blue-400',
  DEPLOYING: 'bg-cyan-900 text-cyan-400',
  SUCCESS: 'bg-emerald-900 text-emerald-400',
  FAILED: 'bg-red-900 text-red-400',
  CANCELLED: 'bg-slate-700 text-slate-400',
};

export default function DeploymentsPage() {
  const searchParams = useSearchParams();
  const projectId = searchParams.get('project');

  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string>(projectId ?? '');
  const [deployments, setDeployments] = useState<Deployment[]>([]);
  const [loadingProjects, setLoadingProjects] = useState(true);
  const [loadingDeployments, setLoadingDeployments] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadProjects() {
      const token = localStorage.getItem('fidscript_token');
      if (!token) { setLoadingProjects(false); return; }
      try {
        const sdk = createFidscript({ apiKey: token });
        const data = await sdk.projects.list();
        setProjects(data);
        if (!selectedProjectId && data.length > 0) {
          setSelectedProjectId(data[0].id);
        }
      } catch {
        // ignore
      } finally {
        setLoadingProjects(false);
      }
    }
    loadProjects();
  }, []);

  useEffect(() => {
    if (!selectedProjectId) return;

    async function loadDeployments() {
      setLoadingDeployments(true);
      setError(null);
      try {
        const token = localStorage.getItem('fidscript_token');
        if (!token) return;
        const sdk = createFidscript({ apiKey: token });
        const data = await sdk.deployments.list(selectedProjectId);
        setDeployments(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load deployments');
      } finally {
        setLoadingDeployments(false);
      }
    }
    loadDeployments();
  }, [selectedProjectId]);

  function handleProjectChange(id: string) {
    setSelectedProjectId(id);
    const url = new URL(window.location.href);
    url.searchParams.set('project', id);
    window.location.href = url.toString();
  }

  if (loadingProjects) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <Spinner size="lg" />
      </div>
    );
  }

  if (projects.length === 0) {
    return (
      <EmptyState
        title="No projects"
        description="Create a project first to view deployments."
        action={
          <Link href="/projects">
            <Button variant="primary" size="sm">Go to Projects</Button>
          </Link>
        }
      />
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-slate-200 mb-1">Deployments</h1>
          <p className="text-sm text-slate-500">
            {deployments.length} deployment{deployments.length !== 1 ? 's' : ''}
          </p>
        </div>
        {selectedProjectId && (
          <Link href={`/deployments/new?project=${selectedProjectId}`}>
            <Button variant="primary" size="sm">New Deployment</Button>
          </Link>
        )}
      </div>

      {/* Project selector */}
      <div className="mb-6">
        <label className="block text-xs text-slate-400 mb-1">Project</label>
        <select
          value={selectedProjectId}
          onChange={e => handleProjectChange(e.target.value)}
          className="bg-[#080a0d] border border-[#1e2130] text-slate-200 rounded-lg px-3 py-2 text-sm min-w-52"
        >
          {projects.map(p => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>
      </div>

      {error && (
        <p className="text-red-400 mb-4 text-sm">{error}</p>
      )}

      {loadingDeployments ? (
        <div className="flex items-center justify-center min-h-48">
          <Spinner size="lg" />
        </div>
      ) : deployments.length === 0 ? (
        <Card className="border border-[#1e2130]">
          <EmptyState
            title="No deployments"
            description="Create your first deployment for this project."
            action={
              <Link href={`/deployments/new?project=${selectedProjectId}`}>
                <Button variant="primary" size="sm">New Deployment</Button>
              </Link>
            }
          />
        </Card>
      ) : (
        <Card className="border border-[#1e2130] overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#1e2130]">
                <th className="text-left text-xs text-slate-500 font-medium px-4 py-3">ID</th>
                <th className="text-left text-xs text-slate-500 font-medium px-4 py-3">Status</th>
                <th className="text-left text-xs text-slate-500 font-medium px-4 py-3">Created</th>
                <th className="text-left text-xs text-slate-500 font-medium px-4 py-3">URL</th>
                <th className="text-left text-xs text-slate-500 font-medium px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {deployments.map(dep => (
                <tr key={dep.id} className="border-b border-[#1e2130] last:border-0 hover:bg-[#1e2130]/30">
                  <td className="px-4 py-3">
                    <span className="font-mono text-xs text-slate-400">
                      {dep.id.slice(0, 8)}…
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full capitalize ${STATUS_COLORS[dep.status] ?? 'bg-slate-700 text-slate-300'}`}>
                      {dep.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-400 text-xs">
                    {new Date(dep.createdAt).toLocaleDateString()}{' '}
                    {new Date(dep.createdAt).toLocaleTimeString()}
                  </td>
                  <td className="px-4 py-3">
                    {dep.deploymentUrl ? (
                      <a
                        href={dep.deploymentUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-400 hover:text-blue-300 text-xs no-underline"
                      >
                        {dep.deploymentUrl.replace(/^https?:\/\//, '')}
                      </a>
                    ) : (
                      <span className="text-slate-600 text-xs">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <Link
                        href={`/deployments/${dep.id}?project=${selectedProjectId}`}
                        className="text-xs text-slate-400 hover:text-slate-200 no-underline"
                      >
                        View
                      </Link>
                      <button
                        className="text-xs text-slate-400 hover:text-slate-200 bg-none border-none cursor-pointer p-0"
                      >
                        Rebuild
                      </button>
                      <button className="text-xs text-red-400 hover:text-red-300 bg-none border-none cursor-pointer p-0">
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}
