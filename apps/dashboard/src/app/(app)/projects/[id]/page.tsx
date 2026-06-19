'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { createFidscript } from '@fidscript/sdk';
import { Card } from '@fidscript/ui';
import { Button } from '@fidscript/ui';
import { Spinner } from '@fidscript/ui';
import type { Project, ProjectMember, EnvVar, Deployment } from '@/types';

type Tab = 'overview' | 'deployments' | 'settings' | 'members';

const TABS: { id: Tab; label: string }[] = [
  { id: 'overview', label: 'Overview' },
  { id: 'deployments', label: 'Deployments' },
  { id: 'members', label: 'Members' },
  { id: 'settings', label: 'Settings' },
];

function OverviewTab({ projectId }: { projectId: string }) {
  const [envVars, setEnvVars] = useState<EnvVar[]>([]);
  const [members, setMembers] = useState<ProjectMember[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const token = localStorage.getItem('fidscript_token');
      if (!token) return;
      const sdk = createFidscript({ apiKey: token });
      const [envRes, membersRes] = await Promise.allSettled([
        sdk.projects.getEnvVars(projectId),
        sdk.projects.listMembers(projectId),
      ]);
      if (envRes.status === 'fulfilled') setEnvVars(envRes.value);
      if (membersRes.status === 'fulfilled') setMembers(membersRes.value);
      setLoading(false);
    }
    load();
  }, [projectId]);

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
    </div>
  );
}

function DeploymentsTab({ projectId }: { projectId: string }) {
  const [deployments, setDeployments] = useState<Deployment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      const token = localStorage.getItem('fidscript_token');
      if (!token) return;
      try {
        const sdk = createFidscript({ apiKey: token });
        const data = await sdk.deployments.list(projectId);
        setDeployments(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load deployments');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [projectId]);

  if (loading) return <Spinner size="md" />;
  if (error) return <p className="text-red-400 text-sm">{error}</p>;
  if (deployments.length === 0) return <p className="text-sm text-slate-500">No deployments yet.</p>;

  return (
    <div className="flex flex-col gap-2">
      {deployments.map(dep => (
        <Card key={dep.id} className="border border-[#1e2130] py-3 px-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-slate-200">{dep.version}</p>
              <p className="text-xs text-slate-500">
                {new Date(dep.createdAt).toLocaleDateString()}{' '}
                {new Date(dep.createdAt).toLocaleTimeString()}
              </p>
            </div>
            <span
              className={`text-xs px-2 py-0.5 rounded-full capitalize ${
                dep.status === 'SUCCESS'
                  ? 'bg-emerald-900 text-emerald-400'
                  : 'bg-[#1e2130] text-slate-400'
              }`}
            >
              {dep.status}
            </span>
          </div>
        </Card>
      ))}
    </div>
  );
}

function MembersTab({ projectId }: { projectId: string }) {
  const [members, setMembers] = useState<ProjectMember[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const token = localStorage.getItem('fidscript_token');
      if (!token) return;
      const sdk = createFidscript({ apiKey: token });
      const data = await sdk.projects.listMembers(projectId);
      setMembers(data);
      setLoading(false);
    }
    load();
  }, [projectId]);

  if (loading) return <Spinner size="md" />;
  if (members.length === 0) return <p className="text-sm text-slate-500">No members yet.</p>;

  return (
    <div className="flex flex-col gap-2">
      {members.map(member => (
        <Card key={member.userId} className="border border-[#1e2130] py-3 px-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-slate-200">{member.email}</p>
              <p className="text-xs text-slate-500">
                Joined {new Date(member.joinedAt).toLocaleDateString()}
              </p>
            </div>
            <span className="text-xs px-2 py-0.5 rounded-full bg-[#1e2130] text-slate-400 capitalize">
              {member.role}
            </span>
          </div>
        </Card>
      ))}
    </div>
  );
}

function SettingsTab({ project }: { project: Project }) {
  const [envVars, setEnvVars] = useState<EnvVar[]>([]);
  const [loading, setLoading] = useState(true);
  const [revealed, setRevealed] = useState<Record<string, boolean>>({});

  useEffect(() => {
    async function load() {
      const token = localStorage.getItem('fidscript_token');
      if (!token) return;
      try {
        const sdk = createFidscript({ apiKey: token });
        const data = await sdk.projects.getEnvVars(project.id);
        setEnvVars(data);
      } catch {
        // env vars may not exist
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [project.id]);

  function toggleReveal(key: string) {
    setRevealed(prev => ({ ...prev, [key]: !prev[key] }));
  }

  return (
    <div className="flex flex-col gap-8">
      {/* Env vars */}
      <div>
        <h3 className="text-sm font-semibold text-slate-200 mb-3">
          Environment Variables
        </h3>
        {loading ? (
          <Spinner size="md" />
        ) : envVars.length === 0 ? (
          <p className="text-sm text-slate-500">No environment variables set.</p>
        ) : (
          <div className="flex flex-col gap-1">
            {envVars.map(env => (
              <div
                key={env.key}
                className="flex items-center gap-3 px-3 py-2 bg-[#0f1117] border border-[#1e2130] rounded-md text-xs font-mono"
              >
                <span className="text-slate-400 min-w-40">{env.key}</span>
                <span className="text-slate-200 flex-1">
                  {env.encrypted && !revealed[env.key] ? '••••••••' : env.value}
                </span>
                {env.encrypted && (
                  <button
                    onClick={() => toggleReveal(env.key)}
                    className="bg-none border-none text-slate-500 cursor-pointer text-xs hover:text-slate-300"
                  >
                    {revealed[env.key] ? 'Hide' : 'Reveal'}
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Danger zone */}
      <div>
        <h3 className="text-sm font-semibold text-red-400 mb-3">Danger Zone</h3>
        <Card className="border border-red-500/50 py-4 px-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-semibold text-slate-200">Delete Project</p>
              <p className="text-xs text-slate-500">
                Permanently delete this project and all its deployments. This cannot be undone.
              </p>
            </div>
            <Button variant="danger" size="sm">
              Delete
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
}

export default function ProjectDetailPage() {
  const params = useParams();
  const projectId = params.id as string;

  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>('overview');

  useEffect(() => {
    async function load() {
      const token = localStorage.getItem('fidscript_token');
      if (!token) { setLoading(false); return; }
      try {
        const sdk = createFidscript({ apiKey: token });
        const data = await sdk.projects.get(projectId);
        setProject(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load project');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [projectId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <Spinner size="lg" />
      </div>
    );
  }

  if (error || !project) {
    return (
      <div>
        <Link href="/projects" className="text-blue-500 text-sm hover:text-blue-400 no-underline">
          Back to Projects
        </Link>
        <p className="text-red-400 mt-4 text-sm">{error || 'Project not found'}</p>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <Link
          href="/projects"
          className="text-sm text-slate-500 hover:text-slate-300 no-underline inline-flex items-center gap-1 mb-2"
        >
          Back to Projects
        </Link>
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-xl font-bold text-slate-200 mb-1">{project.name}</h1>
            <p className="text-sm text-slate-500">
              {project.type} &middot; Created {new Date(project.createdAt).toLocaleDateString()}
            </p>
          </div>
          <span className="text-xs px-2 py-1 rounded-full bg-[#1e2130] text-slate-400 border border-[#1e2130] capitalize">
            {project.status}
          </span>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-[#1e2130] mb-6 overflow-x-auto">
        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2.5 text-sm font-medium transition-colors duration-150 border-b-2 -mb-px whitespace-nowrap ${
              activeTab === tab.id
                ? 'text-slate-200 border-blue-500'
                : 'text-slate-500 border-transparent hover:text-slate-300'
            } bg-none border-none cursor-pointer`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {activeTab === 'overview' && <OverviewTab projectId={projectId} />}
      {activeTab === 'deployments' && <DeploymentsTab projectId={projectId} />}
      {activeTab === 'members' && <MembersTab projectId={projectId} />}
      {activeTab === 'settings' && <SettingsTab project={project} />}
    </div>
  );
}
