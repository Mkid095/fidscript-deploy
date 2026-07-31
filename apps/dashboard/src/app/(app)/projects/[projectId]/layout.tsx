'use client';

import { useEffect, useState } from 'react';
import { useParams, usePathname } from 'next/navigation';
import Link from 'next/link';
import { Spinner } from '@fidscript/ui';

import type { Project } from '@/types';
import { useAuth } from '@/contexts/auth-context';
import { ProjectProvider } from '@/contexts/project-context';
import { ProjectSidebar } from '@/components/layout/project-sidebar';
import { MobileTabBar } from '@/components/layout/mobile-tab-bar';
import { useLocalStorage } from './use-local-storage';
import { ProjectHeader } from './project-header';

const SIDEBAR_KEY = 'fidscript.sidebar.collapsed';
const SECTION_KEY = (id: string) => `fidscript.lastSection.${id}`;

export default function ProjectLayout({ children }: { children: React.ReactNode }) {
  const params = useParams();
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
      <div className="flex items-center justify-center min-h-screen bg-[var(--surface-2)]">
        <Spinner size="lg" />
      </div>
    );
  }

  if (error || !project) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[var(--surface-2)]">
        <div className="text-center">
          <p className="text-[var(--danger)] mb-3">{error ?? 'Project not found'}</p>
          <Link href="/projects" className="text-sm text-[var(--accent)] hover:text-[var(--accent)]">
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
  let lastSection: string | null = null;
  try { lastSection = localStorage.getItem(SECTION_KEY(projectId)); } catch { /* */ }
  const effectiveSection = currentSection || lastSection || 'services';

  return (
    <ProjectProvider projectId={projectId} project={project}>
    <div className="flex h-screen bg-[var(--surface-2)] overflow-hidden">
      {/* Project sidebar */}
      <ProjectSidebar
        project={project}
        collapsed={sidebarCollapsed}
        onCollapse={setSidebarCollapsed}
      />

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <ProjectHeader
          project={project}
          effectiveSection={effectiveSection}
          sidebarCollapsed={sidebarCollapsed}
          onToggleSidebar={() => setSidebarCollapsed(!sidebarCollapsed)}
          showSwitcher={showSwitcher}
          onShowSwitcher={setShowSwitcher}
          allProjects={allProjects}
          projectId={projectId}
        />

        {/* Content — padding gives breathing room between content and chrome */}
        <main className="flex-1 overflow-hidden pb-16 md:pb-0">
          <div className="h-full overflow-y-auto px-4 py-5 sm:px-6 sm:py-6 lg:px-8">
            {children}
          </div>
        </main>
      </div>

      {/* Mobile bottom tab bar (hidden on >= md where the sidebar shows) */}
      <MobileTabBar project={project} />
    </div>
    </ProjectProvider>
  );
}
