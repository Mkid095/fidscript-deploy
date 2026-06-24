'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { Spinner } from '@fidscript/ui';

import type { Project } from '@/types';
import { useAuth } from '@/contexts/auth-context';
import { ProjectProvider } from '@/contexts/project-context';
import { ProjectSidebar } from '@/components/layout/project-sidebar';
import { ProjectSwitcherModal } from '@/components/layout/project-switcher-modal';
import { NotificationBell } from '@/components/layout/notification-bell';

const SIDEBAR_KEY = 'fidscript.sidebar.collapsed';
const SECTION_KEY = (id: string) => `fidscript.lastSection.${id}`;

function useLocalStorage(key: string, fallback: boolean) {
  const [value, setValue] = useState(fallback);
  useEffect(() => {
    try {
      const stored = localStorage.getItem(key);
      if (stored !== null) setValue(stored === 'true');
    } catch {}
  }, [key]);
  const set = useCallback((v: boolean) => {
    setValue(v);
    try { localStorage.setItem(key, String(v)); } catch {}
  }, [key]);
  return [value, set] as const;
}

export default function ProjectLayout({ children }: { children: React.ReactNode }) {
  const params = useParams();
  const router = useRouter();
  const pathname = usePathname();
  const { getSdk } = useAuth();

  const projectId = params.projectId as string;

  const [project, setProject] = useState<Project | null>(null);
  const [allProjects, setAllProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showSwitcher, setShowSwitcher] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useLocalStorage(SIDEBAR_KEY, false);

  // Load project + all projects on mount.
  useEffect(() => {
    let cancelled = false;
    async function load() {
      const sdk = getSdk();
      try {
        const [proj, list] = await Promise.all([
          sdk.projects.get(projectId),
          sdk.projects.list(),
        ]);
        if (!cancelled) {
          setProject(proj);
          setAllProjects(Array.isArray(list) ? list : (list as any).projects ?? []);
          setLoading(false);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load project');
          setLoading(false);
        }
      }
    }
    load();
    return () => { cancelled = true; };
  }, [projectId, getSdk]);

  // Persist last section when pathname changes.
  useEffect(() => {
    if (!projectId || !pathname) return;
    const match = pathname.match(/\/projects\/[^/]+\/([^/]+)/);
    if (match) {
      const section = match[1];
      try { localStorage.setItem(SECTION_KEY(projectId), section); } catch {}
    }
  }, [pathname, projectId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#080a0d]">
        <Spinner size="lg" />
      </div>
    );
  }

  if (error || !project) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#080a0d]">
        <div className="text-center">
          <p className="text-red-400 mb-3">{error ?? 'Project not found'}</p>
          <Link href="/projects" className="text-sm text-blue-500 hover:text-blue-400">
            Back to Projects
          </Link>
        </div>
      </div>
    );
  }

  // Derive current section from pathname.
  const sectionMatch = pathname.match(/\/projects\/[^/]+\/([^/]+)/);
  const currentSection = sectionMatch ? sectionMatch[1] : 'deployments';

  // Last section from localStorage.
  const lastSection = (() => {
    try { return localStorage.getItem(SECTION_KEY(projectId)); } catch { return null; }
  })();
  const effectiveSection = currentSection || lastSection || 'deployments';

  return (
    <ProjectProvider projectId={projectId} project={project}>
    <div className="flex min-h-screen bg-[#080a0d]">
      {/* Project sidebar */}
      <ProjectSidebar
        project={project}
        collapsed={sidebarCollapsed}
        onCollapse={setSidebarCollapsed}
      />

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="h-14 bg-[#0f1117] border-b border-[#1e2130] flex items-center px-4 gap-4 flex-shrink-0">
          {/* Logo — clicking takes you back to the project picker */}
          <Link
            href="/projects"
            className="text-sm font-bold text-slate-300 hover:text-slate-100 mr-2 flex-shrink-0"
          >
            FIDScript
          </Link>

          {/* Breadcrumb */}
          <nav className="flex items-center gap-1 text-sm text-slate-500 min-w-0">
            <Link href="/projects" className="hover:text-slate-300 transition-colors">Projects</Link>
            <span className="text-slate-700">›</span>
            <button
              onClick={() => setShowSwitcher(true)}
              className="hover:text-slate-300 transition-colors truncate max-w-[160px]"
            >
              {project.name}
            </button>
            <span className="text-slate-700">›</span>
            <span className="text-slate-300 capitalize">{effectiveSection}</span>
          </nav>

          <div className="flex-1" />

          {/* Right controls */}
          <div className="flex items-center gap-2">
            {/* Command palette hint */}
            <button className="hidden md:flex items-center gap-1.5 px-2.5 py-1.5 rounded-md bg-[#1e2130] border border-[#2a2d3a] text-xs text-slate-500 hover:text-slate-300 hover:border-[#3a3d4a] transition-colors">
              <span>⌘K</span>
            </button>

            {/* Notification bell */}
            <NotificationBell projectId={projectId} sdk={getSdk()} />

            {/* Account */}
            <button className="w-8 h-8 rounded-full bg-[#1e2130] border border-[#2a2d3a] text-xs text-slate-400 flex items-center justify-center font-medium hover:border-[#3a3d4a] transition-colors">
              {project.name?.charAt(0).toUpperCase()}
            </button>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>

      {/* Project switcher modal */}
      {showSwitcher && (
        <ProjectSwitcherModal
          projects={allProjects}
          currentProjectId={projectId}
          onClose={() => setShowSwitcher(false)}
        />
      )}
    </div>
    </ProjectProvider>
  );
}
