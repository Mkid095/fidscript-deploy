'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { HugeiconsIcon } from '@hugeicons/react';
import { ChevronRightIcon, PanelLeftIcon } from '@hugeicons/core-free-icons';
import { Spinner } from '@fidscript/ui';
import { ThemeToggle } from '@/components/theme/theme-toggle';

import type { Project } from '@/types';
import { useAuth } from '@/contexts/auth-context';
import { ProjectProvider } from '@/contexts/project-context';
import { ProjectSidebar, SECTION_MAP } from '@/components/layout/project-sidebar';
import { MobileTabBar } from '@/components/layout/mobile-tab-bar';
import { ProjectSwitcherModal } from '@/components/layout/project-switcher-modal';
import { AvatarDropdown } from '@/components/layout/avatar-dropdown';

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
  const lastSection = (() => {
    try { return localStorage.getItem(SECTION_KEY(projectId)); } catch { return null; }
  })();
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
        {/* Header */}
        <header className="h-14 bg-[var(--surface-2)] border-b border-[var(--rail)] flex items-center px-4 gap-3 flex-shrink-0">
          {/* Logo — links back to the project picker */}
          <Link
            href="/projects"
            className="flex items-center gap-2 group flex-shrink-0"
            aria-label="FIDScript — back to projects"
          >
            <Image
              src="https://res.cloudinary.com/dfp7uhzy3/image/upload/v1782017464/Generated_Image_June_21__2026_-_2_00AM-removebg-preview_ekpdad.png"
              alt="FIDScript"
              width={26}
              height={26}
              className="rounded-md"
            />
            <span className="text-sm font-bold tracking-widest text-[var(--warning)] uppercase group-hover:text-[var(--warning)] transition-colors">
              fidscript
            </span>
          </Link>

          {/* Desktop: Collapse sidebar button */}
          <button
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className="hidden md:flex items-center justify-center w-8 h-8 rounded-lg text-[var(--text-dim)] hover:bg-[var(--hover)] hover:text-[var(--text-muted)] transition-colors"
            aria-label={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            title={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            <HugeiconsIcon icon={PanelLeftIcon} size={17} />
          </button>

          {/* Divider between logo area and breadcrumb */}
          <div className="hidden md:block w-px h-5 bg-[var(--rail)]" />

          {/* Breadcrumb */}
          <nav className="flex items-center gap-1.5 text-sm text-[var(--text-muted)] min-w-0">
            {/* Mobile: just project name with chevron */}
            <HugeiconsIcon icon={ChevronRightIcon} size={12} className="text-[var(--text-dim)] flex-shrink-0" />
            <button
              onClick={() => setShowSwitcher(true)}
              className="hover:text-[var(--text)] transition-colors truncate max-w-[120px] sm:max-w-[160px] text-[var(--text-muted)] font-medium"
            >
              {project.name}
            </button>
            {/* Desktop: full breadcrumb */}
            <div className="hidden md:flex items-center gap-1.5">
              <HugeiconsIcon icon={ChevronRightIcon} size={12} className="text-[var(--text-dim)] flex-shrink-0" />
              <span className="text-[var(--text-dim)] font-normal">{SECTION_MAP[effectiveSection]?.group ?? '—'}</span>
              <HugeiconsIcon icon={ChevronRightIcon} size={12} className="text-[var(--text-dim)] flex-shrink-0" />
              <span className="text-[var(--text)] font-medium">{SECTION_MAP[effectiveSection]?.label ?? effectiveSection}</span>
            </div>
          </nav>

          <div className="flex-1" />

          {/* Right controls */}
          <div className="flex items-center gap-2 flex-shrink-0 z-10 relative">
            {/* Theme toggle */}
            <ThemeToggle />

            {/* Account menu */}
            <AvatarDropdown />
          </div>
        </header>

        {/* Content — padding gives breathing room between content and chrome */}
        <main className="flex-1 overflow-hidden pb-16 md:pb-0">
          <div className="h-full overflow-y-auto px-4 py-5 sm:px-6 sm:py-6 lg:px-8">
            {children}
          </div>
        </main>
      </div>

      {/* Mobile bottom tab bar (hidden on >= md where the sidebar shows) */}
      <MobileTabBar project={project} />

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
