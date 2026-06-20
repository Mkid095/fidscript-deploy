'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

import type { Project } from '@/types';

export interface NavItem {
  id: string;
  label: string;
  href: string;
  icon: string;
  adminOnly?: boolean;
  ownerOnly?: boolean;
}

const NAV_ITEMS: NavItem[] = [
  { id: 'deployments',  label: 'Deployments',  href: '/deployments',  icon: '▲' },
  { id: 'functions',    label: 'Functions',    href: '/functions',    icon: 'ƒ' },
  { id: 'databases',    label: 'Databases',    href: '/databases',    icon: '⊞' },
  { id: 'storage',      label: 'Storage',      href: '/storage',      icon: '▦' },
  { id: 'realtime',     label: 'Realtime',      href: '/realtime',     icon: '◉' },
  { id: 'queues',       label: 'Queues',        href: '/queues',       icon: '⇁' },
  { id: 'scheduler',    label: 'Scheduler',     href: '/scheduler',    icon: '⏲' },
  { id: 'email',        label: 'Email',         href: '/email',        icon: '✉' },
  { id: 'domains',      label: 'Domains',       href: '/domains',      icon: '🌐' },
  { id: 'monitoring',   label: 'Monitoring',    href: '/monitoring',   icon: '◔' },
  { id: 'logs',         label: 'Logs',          href: '/logs',         icon: '☰' },
  { id: 'settings',     label: 'Settings',      href: '/settings',     icon: '⚙', adminOnly: true },
  { id: 'mcp',          label: 'MCP',           href: '/mcp',          icon: '⬡', adminOnly: true },
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
  const role = project.role ?? 'viewer';

  return (
    <aside
      className="flex flex-col bg-[#0f1117] border-r border-[#1e2130] flex-shrink-0 transition-all duration-200"
      style={{ width: collapsed ? 64 : 240 }}
    >
      {/* Project header */}
      <div
        className="flex items-center border-b border-[#1e2130] gap-2"
        style={{ padding: collapsed ? '0.75rem 0.5rem' : '0.75rem 1rem', justifyContent: collapsed ? 'center' : 'flex-start' }}
      >
        <button
          onClick={() => onCollapse(!collapsed)}
          className="bg-none border-none text-slate-600 cursor-pointer p-0.5 text-sm leading-none hover:text-slate-400 transition-colors"
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? '»' : '«'}
        </button>
        {!collapsed && (
          <span className="text-sm font-semibold text-slate-200 truncate">{project.name}</span>
        )}
      </div>

      {/* Back to projects */}
      <div className="px-2 pt-2 pb-1">
        <Link
          href="/projects"
          className="flex items-center gap-2 px-2 py-1.5 rounded-md text-xs text-slate-500 hover:text-slate-300 hover:bg-[#1e2130] transition-colors"
          style={{ justifyContent: collapsed ? 'center' : 'flex-start' }}
        >
          <span className="text-slate-600">←</span>
          {!collapsed && <span>Projects</span>}
        </Link>
      </div>

      {/* Nav items */}
      <nav className="flex-1 overflow-y-auto p-2">
        {NAV_ITEMS.map(item => {
          const href = `/projects/${project.id}/${item.href}`;
          const active = isActive(pathname, `/projects/${project.id}/${item.id}`);
          const locked = (item.adminOnly && !['owner', 'admin'].includes(role)) ||
                         (item.ownerOnly && role !== 'owner');

          return (
            <Link
              key={item.id}
              href={locked ? '#' : href}
              onClick={e => locked && e.preventDefault()}
              title={collapsed ? item.label : undefined}
              className={`
                flex items-center gap-3 px-3 py-2 mb-0.5 rounded-md text-sm transition-colors duration-150
                ${active
                  ? 'bg-[#1e2130] text-slate-200 font-medium'
                  : locked
                    ? 'text-slate-700 cursor-not-allowed'
                    : 'text-slate-500 hover:text-slate-300 hover:bg-[#1e2130]'
                }
              `}
              style={{ justifyContent: collapsed ? 'center' : 'flex-start' }}
            >
              <span className="text-sm flex-shrink-0 w-5 text-center opacity-60">{item.icon}</span>
              {!collapsed && (
                <span className="truncate">{item.label}</span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Footer: project status */}
      {!collapsed && (
        <div className="px-4 py-3 border-t border-[#1e2130] flex items-center gap-2">
          <span className={`w-2 h-2 rounded-full flex-shrink-0 ${
            project.status === 'ACTIVE' ? 'bg-emerald-500' :
            project.status === 'SUSPENDED' ? 'bg-amber-500' :
            'bg-slate-600'
          }`} />
          <span className="text-xs text-slate-600 capitalize">{project.status?.toLowerCase()}</span>
        </div>
      )}
    </aside>
  );
}
