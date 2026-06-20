'use client';

import { useEffect, useState } from 'react';
import { createFidscript } from '@fidscript/sdk';
import { Card } from '@fidscript/ui';
import { Spinner } from '@fidscript/ui';

import { useAuth } from '@/contexts/auth-context';

interface ProjectSummary {
  id: string;
  name: string;
  status: string;
}

interface DeploymentSummary {
  id: string;
  projectId: string;
  status: string;
  createdAt: string;
}

export default function DashboardPage() {
  const { user } = useAuth();
  const [projects, setProjects] = useState<ProjectSummary[]>([]);
  const [deployments, setDeployments] = useState<DeploymentSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadData() {
      const token = localStorage.getItem('fidscript_token');
      if (!token) {
        setLoading(false);
        return;
      }
      try {
        const sdk = createFidscript({ apiKey: token });
        const projectsRes = await sdk.projects.list();
        setProjects(projectsRes);
        setDeployments([]);
        setLoading(false);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load dashboard');
        setLoading(false);
      }
    }
    loadData();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <Spinner size="lg" />
      </div>
    );
  }

  const activeDeployments = deployments.filter(d => d.status === 'active').length;

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-200 mb-1">
          Welcome back, {user?.name || user?.email}
        </h1>
        <p className="text-sm text-slate-500">
          Here is what is happening with your projects.
        </p>
      </div>

      {error && (
        <p className="text-red-400 mb-4 text-sm">{error}</p>
      )}

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        <Card className="border border-[#1e2130]">
          <p className="text-slate-500 text-xs mb-2">Projects</p>
          <p className="text-3xl font-bold text-slate-200">{projects.length}</p>
        </Card>

        <Card className="border border-[#1e2130]">
          <p className="text-slate-500 text-xs mb-2">Active Deployments</p>
          <p className="text-3xl font-bold text-slate-200">{activeDeployments}</p>
        </Card>

        <Card className="border border-[#1e2130]">
          <p className="text-slate-500 text-xs mb-2">Total Deployments</p>
          <p className="text-3xl font-bold text-slate-200">{deployments.length}</p>
        </Card>
      </div>

      {/* Recent Activity */}
      <div>
        <h2 className="text-base font-semibold text-slate-200 mb-4">
          Recent Activity
        </h2>
        <Card className="border border-[#1e2130]">
          <p className="text-sm text-slate-500">No recent activity.</p>
        </Card>
      </div>
    </div>
  );
}
