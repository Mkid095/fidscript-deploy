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
      className="hidden md:flex flex-col bg-[#0c0e14] border-r border-[#1e2130] flex-shrink-0 transition-all duration-200 overflow-hidden"
      style={{ width: collapsed ? 64 : 232 }}
    >
      {/* Header: project name + All projects breadcrumb */}
      <div
        className="flex flex-col border-b border-[#1e2130] flex-shrink-0"
        style={{ padding: collapsed ? '0.625rem 0.5rem' : '0.625rem 0.75rem' }}
      >
        {/* Project name — always shown */}
        <div className="flex items-center justify-between gap-2 mb-1.5">
          <span
            className="text-sm font-semibold text-slate-200 truncate"
            title={project.name}
          >
            {collapsed ? project.name.charAt(0).toUpperCase() : project.name}
          </span>
          {collapsed && (
            <Link
              href="/projects"
              className="text-slate-600 hover:text-slate-300 transition-colors p-0.5 rounded hover:bg-[#1e2130]"
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
            className="group flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-200 transition-colors py-1 px-1.5 rounded hover:bg-[#1e2130] w-full"
          >
            <HugeiconsIcon icon={ArrowLeft01Icon} size={11} className="text-slate-600 group-hover:text-slate-400 flex-shrink-0" />
            <span>All projects</span>
          </Link>
        )}
      </div>

      {/* Nav — independently scrollable */}
      <nav className="flex-1 min-h-0 overflow-y-auto px-2 py-2">
        {/* Section label */}
        {!collapsed && (
          <p className="text-[10px] font-semibold tracking-widest text-slate-700 uppercase mb-2 px-1.5">
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
                    ? 'bg-blue-500/10 text-blue-300 font-medium border border-blue-500/20'
                    : locked
                      ? 'text-slate-700 cursor-not-allowed'
                      : 'text-slate-500 hover:text-slate-200 hover:bg-[#1e2130] border border-transparent'
                  }
                `}
                style={{ justifyContent: collapsed ? 'center' : 'flex-start' }}
              >
                <HugeiconsIcon
                  icon={item.icon}
                  size={15}
                  className={`flex-shrink-0 transition-colors ${active ? 'text-blue-400' : 'text-slate-600 group-hover:text-slate-400'}`}
                />
                {!collapsed && <span className="truncate">{item.label}</span>}
              </Link>
            );
          })}
        </div>
      </nav>

      {/* Footer: status + collapse toggle */}
      <div className="border-t border-[#1e2130] flex items-center justify-between gap-2 flex-shrink-0"
        style={{ padding: collapsed ? '0.625rem 0.5rem' : '0.625rem 0.75rem' }}
      >
        {!collapsed && (
          <div className="flex items-center gap-2">
            <span className={`w-2 h-2 rounded-full flex-shrink-0 ${
              project.status === 'ACTIVE' ? 'bg-emerald-500' :
              project.status === 'SUSPENDED' ? 'bg-amber-500' :
              project.status === 'CREATING' ? 'bg-blue-500 animate-pulse' :
              'bg-slate-600'
            }`} />
            <span className="text-xs text-slate-500 capitalize">{project.status?.toLowerCase()}</span>
          </div>
        )}
        <button
          onClick={() => onCollapse(!collapsed)}
          className="bg-none border-none text-slate-600 cursor-pointer p-1 rounded hover:text-slate-300 hover:bg-[#1e2130] transition-colors ml-auto"
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          <HugeiconsIcon icon={collapsed ? ArrowRight01Icon : ArrowLeft02Icon} size={13} />
        </button>
      </div>
    </aside>
  );
}
