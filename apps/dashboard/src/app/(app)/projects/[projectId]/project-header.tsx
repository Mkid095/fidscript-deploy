'use client';

import Link from 'next/link';
import Image from 'next/image';
import { HugeiconsIcon } from '@hugeicons/react';
import { ChevronRightIcon, PanelLeftIcon } from '@hugeicons/core-free-icons';

import { ThemeToggle } from '@/components/theme/theme-toggle';
import { AvatarDropdown } from '@/components/layout/avatar-dropdown';
import { ProjectSwitcherModal } from '@/components/layout/project-switcher-modal';
import { SECTION_MAP } from '@/components/layout/project-sidebar';
import type { Project } from '@/types';

interface ProjectHeaderProps {
  project: Project;
  effectiveSection: string;
  sidebarCollapsed: boolean;
  onToggleSidebar: () => void;
  showSwitcher: boolean;
  onShowSwitcher: (v: boolean) => void;
  allProjects: Project[];
  projectId: string;
}

export function ProjectHeader({
  project,
  effectiveSection,
  sidebarCollapsed,
  onToggleSidebar,
  showSwitcher,
  onShowSwitcher,
  allProjects,
  projectId,
}: ProjectHeaderProps) {
  return (
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
        onClick={onToggleSidebar}
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
          onClick={() => onShowSwitcher(true)}
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
        <ThemeToggle />
        <AvatarDropdown />
      </div>

      {/* Project switcher modal */}
      {showSwitcher && (
        <ProjectSwitcherModal
          projects={allProjects}
          currentProjectId={projectId}
          onClose={() => onShowSwitcher(false)}
        />
      )}
    </header>
  );
}
