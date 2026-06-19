'use client';

import { useState, type ReactNode } from 'react';
import Link from 'next/link';
import { useAuth } from '@/contexts/auth-context';
import { AuthGuard } from '@/components/auth-guard';
import { Button } from '@fidscript/ui';

interface NavItem {
  label: string;
  href: string;
}

const NAV_ITEMS: NavItem[] = [
  { label: 'Dashboard', href: '/' },
  { label: 'Projects', href: '/projects' },
  { label: 'Deployments', href: '/deployments' },
  { label: 'Storage', href: '/storage' },
  { label: 'Databases', href: '/databases' },
  { label: 'Email', href: '/email' },
  { label: 'Functions', href: '/functions' },
  { label: 'Queues', href: '/queues' },
  { label: 'Scheduler', href: '/scheduler' },
  { label: 'Monitoring', href: '/monitoring' },
  { label: 'Logs', href: '/logs' },
  { label: 'Settings', href: '/settings' },
];

function Sidebar({
  collapsed,
  onToggle,
}: {
  collapsed: boolean;
  onToggle: () => void;
}) {
  const { user } = useAuth();

  return (
    <aside
      className={`min-h-screen flex flex-col bg-[#0f1117] border-r border-[#1e2130] flex-shrink-0 transition-all duration-200`}
      style={{ width: collapsed ? 64 : 240 }}
    >
      {/* Logo */}
      <div
        className={`flex items-center border-b border-[#1e2130] gap-2`}
        style={{
          padding: '1rem',
          justifyContent: collapsed ? 'center' : 'flex-start',
        }}
      >
        <button
          onClick={onToggle}
          className="bg-none border-none text-slate-500 cursor-pointer p-0.5 text-lg leading-none"
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? '»' : '«'}
        </button>
        {!collapsed && (
          <span className="text-base font-bold text-slate-200 whitespace-nowrap">
            FIDScript
          </span>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto p-2">
        {NAV_ITEMS.map(item => (
          <Link
            key={item.href}
            href={item.href}
            className="flex items-center gap-3 px-3 py-2 mb-1 rounded-md text-slate-400 hover:text-slate-200 hover:bg-[#1e2130] text-sm transition-colors duration-150"
            style={{ justifyContent: collapsed ? 'center' : 'flex-start' }}
          >
            <span className="text-base flex-shrink-0 w-4 text-center">
              {item.label.charAt(0)}
            </span>
            {!collapsed && <span>{item.label}</span>}
          </Link>
        ))}
      </nav>

      {/* User */}
      {!collapsed && user && (
        <div
          className="px-4 py-3 border-t border-[#1e2130] text-xs text-slate-500 truncate"
        >
          {user.email}
        </div>
      )}
    </aside>
  );
}

function TopBar() {
  const { user, logout } = useAuth();

  return (
    <header
      className="h-14 bg-[#0f1117] border-b border-[#1e2130] flex items-center justify-end px-6 gap-4 flex-shrink-0"
    >
      {user && (
        <>
          <span className="text-sm text-slate-500">{user.name || user.email}</span>
          <Button variant="ghost" size="sm" onClick={logout}>
            Sign out
          </Button>
        </>
      )}
    </header>
  );
}

function Shell({ children }: { children: ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className="flex min-h-screen">
      <Sidebar collapsed={collapsed} onToggle={() => setCollapsed(c => !c)} />
      <div className="flex-1 flex flex-col overflow-hidden">
        <TopBar />
        <main className="flex-1 overflow-y-auto p-6">{children}</main>
      </div>
    </div>
  );
}

export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <AuthGuard>
      <Shell>{children}</Shell>
    </AuthGuard>
  );
}
