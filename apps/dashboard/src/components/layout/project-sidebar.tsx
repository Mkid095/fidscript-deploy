'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { HugeiconsIcon } from '@hugeicons/react';
import {
  ArrowLeft01Icon,
  Database01Icon,
  HardDriveIcon,
  Mail01Icon,
  Rocket01Icon,
  Settings01Icon,
  Share08Icon,
  Clock01Icon,
  FlashIcon,
  Analytics01Icon,
  Note01Icon,
  GlobalIcon,
  SourceCodeIcon,
  ArrowRight01Icon,
  ArrowLeft02Icon,
  Layers01Icon,
} from '@hugeicons/core-free-icons';

import type { Project } from '@/types';

export interface NavItem {
  id: string;
  label: string;
  href: string;
  icon: typeof Rocket01Icon;
  adminOnly?: boolean;
  ownerOnly?: boolean;
}

// Priority items shown directly in the mobile bottom bar; the rest go in the
// "More" sheet. Exported so MobileTabBar can reuse the same model.
export const MOBILE_PRIORITY_IDS = ['services', 'databases', 'storage', 'logs'];

export const NAV_ITEMS: NavItem[] = [
  { id: 'services',   label: 'Services',   href: '/services',   icon: Rocket01Icon },
  { id: 'functions',   label: 'Functions',   href: '/functions',   icon: SourceCodeIcon },
  { id: 'databases',   label: 'Databases',   href: '/databases',   icon: Database01Icon },
  { id: 'storage',     label: 'Storage',     href: '/storage',     icon: HardDriveIcon },
  { id: 'queues',      label: 'Queues',      href: '/queues',      icon: Share08Icon },
  { id: 'scheduler',   label: 'Scheduler',   href: '/scheduler',   icon: Clock01Icon },
  { id: 'email',       label: 'Email',       href: '/email',       icon: Mail01Icon },
  { id: 'domains',     label: 'Domains',     href: '/domains',     icon: GlobalIcon },
  { id: 'realtime',    label: 'Realtime',    href: '/realtime',    icon: FlashIcon },
  { id: 'monitoring',  label: 'Monitoring',  href: '/monitoring',  icon: Analytics01Icon },
  { id: 'logs',        label: 'Logs',        href: '/logs',        icon: Note01Icon },
  { id: 'settings',    label: 'Settings',    href: '/settings',    icon: Settings01Icon, adminOnly: true },
  { id: 'mcp',         label: 'MCP',         href: '/mcp',         icon: Layers01Icon,   adminOnly: true },
];

function isActive(href: string, pathname: string): boolean {
  return pathname === href || pathname.startsWith(href + '/');
}

interface ProjectSidebarProps {
  project: Project;
  collapsed: boolean;
  onCollapse: (v: boolean) => void;
}

export function ProjectSidebar({ project, collapsed, onCollapse }: ProjectSidebarProps) {
  const pathname = usePathname();
  const role = (project.role ?? 'viewer').toLowerCase();

  return (
    <aside
      className="hidden md:flex flex-col bg-[var(--surface)] border-r border-[var(--rail)] flex-shrink-0 transition-all duration-200 overflow-hidden"
      style={{ width: collapsed ? 64 : 232 }}
    >
      {/* Header: project name + All projects breadcrumb */}
      <div
        className="flex flex-col border-b border-[var(--rail)] flex-shrink-0"
        style={{ padding: collapsed ? '0.625rem 0.5rem' : '0.625rem 0.75rem' }}
      >
        {/* Project name — always shown */}
        <div className="flex items-center justify-between gap-2 mb-1.5">
          <span
            className="text-sm font-semibold text-[var(--text)] truncate"
            title={project.name}
          >
            {collapsed ? project.name.charAt(0).toUpperCase() : project.name}
          </span>
          {collapsed && (
            <Link
              href="/projects"
              className="text-[var(--text-dim)] hover:text-[var(--text-muted)] transition-colors p-0.5 rounded hover:bg-[var(--hover)]"
              aria-label="All projects"
            >
              <HugeiconsIcon icon={ArrowLeft01Icon} size={12} />
            </Link>
          )}
        </div>

        {/* All projects link — full row, acts as breadcrumb */}
        {!collapsed && (
          <Link
            href="/projects"
            className="group flex items-center gap-1.5 text-xs text-[var(--text-dim)] hover:text-[var(--text)] transition-colors py-1 px-1.5 rounded hover:bg-[var(--hover)] w-full"
          >
            <HugeiconsIcon icon={ArrowLeft01Icon} size={11} className="text-[var(--text-dim)] group-hover:text-[var(--text-dim)] flex-shrink-0" />
            <span>All projects</span>
          </Link>
        )}
      </div>

      {/* Nav — independently scrollable */}
      <nav className="flex-1 min-h-0 overflow-y-auto px-2 py-2">
        {/* Section label */}
        {!collapsed && (
          <p className="text-[10px] font-semibold tracking-widest text-[var(--text-dim)] uppercase mb-2 px-1.5">
            Navigation
          </p>
        )}

        <div className="space-y-0.5">
          {NAV_ITEMS.map(item => {
            const href = `/projects/${project.id}/${item.href}`;
            const active = isActive(`/projects/${project.id}/${item.id}`, pathname);
            const locked = (item.adminOnly && !['owner', 'admin'].includes(role)) ||
                           (item.ownerOnly && role !== 'owner');

            return (
              <Link
                key={item.id}
                href={locked ? '#' : href}
                onClick={e => locked && e.preventDefault()}
                title={collapsed ? item.label : undefined}
                className={`
                  group flex items-center gap-2.5 px-2.5 py-2 rounded-md text-sm transition-all duration-150
                  ${active
                    ? 'bg-[var(--active)] text-[var(--text)] font-medium'
                    : locked
                      ? 'text-[var(--text-dim)] cursor-not-allowed'
                      : 'text-[var(--text-dim)] hover:text-[var(--text)] hover:bg-[var(--hover)] border border-transparent'
                  }
                `}
                style={{ justifyContent: collapsed ? 'center' : 'flex-start' }}
              >
                <HugeiconsIcon
                  icon={item.icon}
                  size={15}
                  className={`flex-shrink-0 transition-colors ${active ? 'text-[var(--text)]' : 'text-[var(--text-dim)] group-hover:text-[var(--text-dim)]'}`}
                />
                {!collapsed && <span className="truncate">{item.label}</span>}
              </Link>
            );
          })}
        </div>
      </nav>

      {/* Footer: status + collapse toggle */}
      <div className="border-t border-[var(--rail)] flex items-center justify-between gap-2 flex-shrink-0"
        style={{ padding: collapsed ? '0.625rem 0.5rem' : '0.625rem 0.75rem' }}
      >
        {!collapsed && (
          <div className="flex items-center gap-2">
            <span className={`w-2 h-2 rounded-full flex-shrink-0 ${
              project.status === 'ACTIVE' ? 'bg-[var(--success)]' :
              project.status === 'SUSPENDED' ? 'bg-[var(--warning)]' :
              project.status === 'CREATING' ? 'bg-[var(--accent)] animate-pulse' :
              'bg-[var(--text-dim)]'
            }`} />
            <span className="text-xs text-[var(--text-dim)] capitalize">{project.status?.toLowerCase()}</span>
          </div>
        )}
        <button
          onClick={() => onCollapse(!collapsed)}
          className="bg-none border-none text-[var(--text-dim)] cursor-pointer p-1 rounded hover:text-[var(--text-muted)] hover:bg-[var(--hover)] transition-colors ml-auto"
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          <HugeiconsIcon icon={collapsed ? ArrowRight01Icon : ArrowLeft02Icon} size={13} />
        </button>
      </div>
    </aside>
  );
}
