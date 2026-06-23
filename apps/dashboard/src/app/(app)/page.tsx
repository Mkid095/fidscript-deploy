'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button, Card, Spinner } from '@fidscript/ui';

import { CreateProjectModal } from '@/components/projects/create-project-modal';
import { useAuth } from '@/contexts/auth-context';
import type { Project } from '@/types';

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

const TYPE_COLORS: Record<string, string> = {
  frontend: 'bg-blue-500/20 text-blue-300',
  backend: 'bg-purple-500/20 text-purple-300',
  worker: 'bg-orange-500/20 text-orange-300',
  cron: 'bg-yellow-500/20 text-yellow-300',
  docker: 'bg-slate-500/20 text-slate-300',
  static: 'bg-emerald-500/20 text-emerald-300',
};

function ProjectCard({ project, onClick }: { project: Project; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="w-full text-left rounded-xl border border-[#1e2130] bg-[#0f1217] p-4 hover:border-blue-500/50 transition-colors group"
    >
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-sm font-semibold text-slate-200 truncate group-hover:text-white">
              {project.name}
            </span>
            <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium flex-shrink-0 ${TYPE_COLORS[project.type] ?? 'bg-slate-500/20 text-slate-300'}`}>
              {project.type}
            </span>
          </div>
          <span className="text-xs text-slate-500 font-mono">{project.slug}</span>
        </div>
        <span className={`w-2 h-2 rounded-full flex-shrink-0 mt-1.5 ${
          project.status === 'ACTIVE' ? 'bg-emerald-400' :
          project.status === 'SUSPENDED' ? 'bg-yellow-400' :
          'bg-slate-600'
        }`} />
      </div>
      <div className="flex items-center justify-between text-xs text-slate-500">
        <span>Updated {project.lastActivityAt ? relativeTime(project.lastActivityAt) : 'never'}</span>
        {project.role && (
          <span className={`px-1.5 py-0.5 rounded text-[10px] ${
            project.role === 'owner' ? 'bg-amber-500/20 text-amber-300' :
            project.role === 'admin' ? 'bg-blue-500/20 text-blue-300' :
            'bg-slate-500/20 text-slate-400'
          }`}>
            {project.role}
          </span>
        )}
      </div>
    </button>
  );
}

export default function DashboardPage() {
  const { user, getSdk } = useAuth();
  const router = useRouter();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const sdk = getSdk();
        const list = await sdk.projects.list();
        setProjects(list);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load projects');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [getSdk]);

  function handleProjectCreated(project: Project) {
    setProjects(prev => [project, ...prev]);
    router.push(`/projects/${project.id}`);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-200">
            {user?.name ? `Welcome back, ${user.name}` : 'Projects'}
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            {projects.length === 0 ? 'Create your first project to get started' : `${projects.length} project${projects.length !== 1 ? 's' : ''}`}
          </p>
        </div>
        <Button variant="primary" size="sm" onClick={() => setModalOpen(true)}>
          New Project
        </Button>
      </div>

      {error && (
        <div className="mb-4 p-3 rounded-lg bg-red-900/30 border border-red-800 text-sm text-red-300">
          {error}
          <button onClick={() => window.location.reload()} className="ml-3 underline hover:no-underline">Retry</button>
        </div>
      )}

      {/* Empty state */}
      {projects.length === 0 && !error && (
        <Card className="border border-[#1e2130] p-12 text-center">
          <div className="text-4xl mb-3 opacity-40">🚀</div>
          <h2 className="text-lg font-semibold text-slate-200 mb-1">No projects yet</h2>
          <p className="text-sm text-slate-500 mb-6">Create your first project in under two minutes.</p>
          <Button variant="primary" onClick={() => setModalOpen(true)}>
            Create your first project
          </Button>
        </Card>
      )}

      {/* Project grid */}
      {projects.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {projects.map(project => (
            <ProjectCard
              key={project.id}
              project={project}
              onClick={() => router.push(`/projects/${project.id}`)}
            />
          ))}
        </div>
      )}

      <CreateProjectModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onCreated={handleProjectCreated}
      />
    </div>
  );
}
