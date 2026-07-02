'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { HugeiconsIcon } from '@hugeicons/react';
import {
  ArrowLeft01Icon,
  Rocket01Icon,
  Database01Icon,
  HardDriveIcon,
  SourceCodeIcon,
  Share08Icon,
  Clock01Icon,
  Mail01Icon,
  GlobalIcon,
  FlashIcon,
  Analytics01Icon,
  Note01Icon,
  Settings01Icon,
  Layers01Icon,
  ArrowRight01Icon,
  FoldHorizontalIcon,
} from '@hugeicons/core-free-icons';

import type { Project } from '@/types';

export interface NavItem {
  id: string;
  label: string;
  href: string;
  icon: typeof Rocket01Icon;
  badge?: string;
  adminOnly?: boolean;
}

export const MOBILE_PRIORITY_IDS = ['services', 'databases', 'storage', 'logs'];

export const NAV_GROUPS: { label: string; items: NavItem[] }[] = [
  {
    label: 'Deploy',
    items: [
      { id: 'services',  label: 'Services',  href: '/services',  icon: Rocket01Icon },
      { id: 'functions', label: 'Functions', href: '/functions', icon: SourceCodeIcon },
    ],
  },
  {
    label: 'Data',
    items: [
      { id: 'databases', label: 'Databases', href: '/databases', icon: Database01Icon },
      { id: 'storage',   label: 'Storage',   href: '/storage',   icon: HardDriveIcon },
      { id: 'queues',    label: 'Queues',    href: '/queues',    icon: Share08Icon },
    ],
  },
  {
    label: 'Infra',
    items: [
      { id: 'scheduler',  label: 'Scheduler',  href: '/scheduler',  icon: Clock01Icon },
      { id: 'email',      label: 'Email',      href: '/email',      icon: Mail01Icon },
      { id: 'domains',    label: 'Domains',    href: '/domains',    icon: GlobalIcon },
      { id: 'realtime',   label: 'Realtime',   href: '/realtime',   icon: FlashIcon },
    ],
  },
  {
    label: 'Observe',
    items: [
      { id: 'monitoring', label: 'Monitoring', href: '/monitoring', icon: Analytics01Icon },
      { id: 'logs',       label: 'Logs',       href: '/logs',       icon: Note01Icon },
    ],
  },
  {
    label: 'Settings',
    items: [
      { id: 'settings', label: 'Settings', href: '/settings', icon: Settings01Icon, adminOnly: true },
      { id: 'mcp',      label: 'MCP',      href: '/mcp',      icon: Layers01Icon,   adminOnly: true },
    ],
  },
];

export interface SectionInfo {
  group: string;
  label: string;
}

// Flat lookup map for breadcrumb display
export const SECTION_MAP: Record<string, SectionInfo> = {
  services:   { group: 'Deploy',   label: 'Services' },
  functions:  { group: 'Deploy',   label: 'Functions' },
  databases:  { group: 'Data',     label: 'Databases' },
  storage:    { group: 'Data',     label: 'Storage' },
  queues:     { group: 'Data',     label: 'Queues' },
  scheduler:  { group: 'Infra',    label: 'Scheduler' },
  email:      { group: 'Infra',    label: 'Email' },
  domains:    { group: 'Infra',    label: 'Domains' },
  realtime:  { group: 'Infra',    label: 'Realtime' },
  monitoring: { group: 'Observe',  label: 'Monitoring' },
  logs:       { group: 'Observe',  label: 'Logs' },
  settings:   { group: 'Settings', label: 'Settings' },
  mcp:        { group: 'Settings', label: 'MCP' },
};

function isActive(href: string, pathname: string): boolean {
  return pathname === href || pathname.startsWith(href + '/');
}

interface ProjectSidebarProps {
  project: Project;
  collapsed: boolean;
  onCollapse: (v: boolean) => void;
}

function StatusDot({ status }: { status?: string }) {
  const color =
    status === 'ACTIVE' ? 'bg-emerald-400' :
    status === 'SUSPENDED' ? 'bg-amber-400' :
    status === 'CREATING' ? 'bg-blue-400 animate-pulse' :
    'bg-slate-500';
  return <span className={`w-2 h-2 rounded-full ${color}`} />;
}

export function ProjectSidebar({ project, collapsed, onCollapse }: ProjectSidebarProps) {
  const pathname = usePathname();
  const role = (project.role ?? 'viewer').toLowerCase();

  return (
    <aside
      className="hidden md:flex flex-col bg-[var(--surface)] border-r border-[var(--rail)] flex-shrink-0 transition-all duration-300 ease-out overflow-hidden"
      style={{ width: collapsed ? 64 : 240 }}
    >
      {/* Header */}
      <div className="flex flex-col border-b border-[var(--rail)] flex-shrink-0">
        {/* Project name row */}
        <div
          className="flex items-center justify-between gap-2"
          style={{ padding: collapsed ? '0.75rem 0.625rem' : '0.875rem 1rem' }}
        >
          {collapsed ? (
            // Collapsed: avatar button (clicking does nothing since top bar controls expand)
            <div className="w-9 h-9 rounded-lg bg-[var(--rail)] flex items-center justify-center text-sm font-bold text-[var(--text)]">
              {project.name.charAt(0).toUpperCase()}
            </div>
          ) : (
            // Expanded: full project info
            <div className="flex items-center gap-2.5 min-w-0 flex-1">
              <div className="w-9 h-9 rounded-lg bg-[var(--accent)]/10 flex items-center justify-center text-sm font-bold text-[var(--accent)] flex-shrink-0">
                {project.name.charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-[var(--text)] truncate">{project.name}</p>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <StatusDot status={project.status} />
                  <span className="text-[10px] text-[var(--text-dim)] capitalize">{project.status?.toLowerCase()}</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* All projects link (only when expanded) */}
        {!collapsed && (
          <div className="px-2 pb-2">
            <Link
              href="/projects"
              className="group flex items-center gap-2 w-full px-3 py-2 rounded-lg text-xs text-[var(--text-dim)] hover:text-[var(--text)] hover:bg-[var(--hover)] transition-all"
            >
              <HugeiconsIcon icon={ArrowLeft01Icon} size={14} className="flex-shrink-0" />
              <span>All projects</span>
            </Link>
          </div>
        )}
      </div>

      {/* Navigation */}
      {collapsed ? (
        // Collapsed: icons only
        <nav className="flex-1 overflow-y-auto py-2 px-1.5">
          <div className="space-y-0.5">
            {NAV_GROUPS.flatMap(g => g.items).map(item => {
              const href = `/projects/${project.id}${item.href}`;
              const active = isActive(href, pathname);
              const locked = item.adminOnly && !['owner', 'admin'].includes(role);

              return (
                <Link
                  key={item.id}
                  href={locked ? '#' : href}
                  onClick={e => locked && e.preventDefault()}
                  title={item.label}
                  className={`
                    group flex items-center justify-center w-10 h-10 rounded-lg transition-all duration-150
                    ${active
                      ? 'bg-[var(--accent)]/15 text-[var(--accent)]'
                      : locked
                        ? 'text-[var(--text-dim)] cursor-not-allowed opacity-50'
                        : 'text-[var(--text-dim)] hover:bg-[var(--hover)] hover:text-[var(--text-muted)]'
                    }
                  `}
                >
                  <HugeiconsIcon icon={item.icon} size={18} />
                </Link>
              );
            })}
          </div>
        </nav>
      ) : (
        // Expanded: grouped nav
        <nav className="flex-1 overflow-y-auto py-3 px-2">
          {NAV_GROUPS.map(group => {
            const visibleItems = group.items.filter(
              item => !item.adminOnly || ['owner', 'admin'].includes(role),
            );
            if (visibleItems.length === 0) return null;

            return (
              <div key={group.label} className="mb-4 last:mb-0">
                <p className="text-[10px] font-semibold tracking-wider text-[var(--text-dim)] uppercase mb-1 px-2">
                  {group.label}
                </p>
                <div className="space-y-0.5">
                  {visibleItems.map(item => {
                    const href = `/projects/${project.id}${item.href}`;
                    const active = isActive(href, pathname);

                    return (
                      <Link
                        key={item.id}
                        href={href}
                        className={`
                          group flex items-center gap-3 px-2.5 py-2 rounded-lg text-sm transition-all duration-150
                          ${active
                            ? 'bg-[var(--accent)]/15 text-[var(--accent)] font-medium'
                            : 'text-[var(--text-dim)] hover:bg-[var(--hover)] hover:text-[var(--text-muted)]'
                          }
                        `}
                      >
                        <HugeiconsIcon
                          icon={item.icon}
                          size={17}
                          className={active ? 'text-[var(--accent)]' : 'text-[var(--text-dim)] group-hover:text-[var(--text-dim)]'}
                        />
                        <span className="flex-1">{item.label}</span>
                        {active && (
                          <HugeiconsIcon icon={ArrowRight01Icon} size={13} className="text-[var(--accent)]" />
                        )}
                      </Link>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </nav>
      )}

      {/* Footer — status + expand button (only when collapsed) */}
      <div
        className="border-t border-[var(--rail)] flex-shrink-0"
        style={{ padding: collapsed ? '0.5rem' : '0.75rem 1rem' }}
      >
        {collapsed ? (
          <button
            onClick={() => onCollapse(false)}
            className="w-full flex items-center justify-center p-2 rounded-lg text-[var(--text-dim)] hover:text-[var(--text-muted)] hover:bg-[var(--hover)] transition-colors"
            title="Expand sidebar"
          >
            <HugeiconsIcon icon={FoldHorizontalIcon} size={16} />
          </button>
        ) : (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <StatusDot status={project.status} />
              <span className="text-xs text-[var(--text-dim)] capitalize">{project.status?.toLowerCase()}</span>
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}
