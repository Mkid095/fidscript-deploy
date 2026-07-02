'use client';
/* eslint-disable import/order */

import Link from 'next/link';
import { usePathname, useParams } from 'next/navigation';
import { HugeiconsIcon } from '@hugeicons/react';
import {
  Database01Icon,
  SourceCodeIcon,
  HardDriveIcon,
  Settings01Icon,
  ComputerTerminal01Icon,
} from '@hugeicons/core-free-icons';
import { DatabaseProvider } from '../database-context';

const NAV = [
  { label: 'Overview',   icon: Database01Icon,        path: '' },
  { label: 'Explorer',   icon: SourceCodeIcon,        path: '/explorer' },
  { label: 'SQL Editor', icon: ComputerTerminal01Icon, path: '/sql' },
  { label: 'Backups',    icon: HardDriveIcon,         path: '/backups' },
  { label: 'Settings',   icon: Settings01Icon,        path: '/settings' },
];

export default function DatabaseDetailLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() || '';
  const params = useParams<{ projectId: string; databaseId: string }>();
  const base = `/projects/${params.projectId}/databases/${params.databaseId}`;
  const current = pathname.startsWith(base) ? pathname.slice(base.length) : pathname;

  return (
    <DatabaseProvider projectId={params.projectId} databaseId={params.databaseId}>
      <div className="flex h-full">
        <aside className="w-52 border-r border-[var(--rail)] bg-[var(--surface)] flex-shrink-0">
          <div className="px-4 py-3 border-b border-[var(--rail)]">
            <p className="text-[10px] uppercase tracking-wider text-[var(--text-dim)] font-semibold">Database</p>
            <p className="text-xs font-mono text-[var(--text-muted)] truncate mt-0.5">{params.databaseId?.slice(0, 8) || '—'}</p>
          </div>
          <nav className="p-2 space-y-0.5">
            {NAV.map(n => {
              const active = current === n.path;
              return (
                <Link
                  key={n.path}
                  href={base + n.path}
                  className={`flex items-center gap-2.5 px-2.5 py-[7px] rounded-md text-[13px] font-medium transition-all ${
                    active
                      ? 'bg-[var(--active)] text-[var(--text)]'
                      : 'text-[var(--text-dim)] hover:bg-[var(--hover)] hover:text-[var(--text-muted)]'
                  }`}
                >
                  <HugeiconsIcon
                    icon={n.icon}
                    size={15}
                    strokeWidth={1.5}
                    className={active ? 'text-[var(--text)]' : 'text-[var(--text-dim)]'}
                  />
                  {n.label}
                </Link>
              );
            })}
          </nav>
        </aside>
        <div className="flex-1 min-w-0 overflow-y-auto bg-black">
          {children}
        </div>
      </div>
    </DatabaseProvider>
  );
}
