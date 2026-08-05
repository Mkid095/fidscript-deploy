'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { HugeiconsIcon } from '@hugeicons/react';

import type { NavItem } from '@/app/(app)/projects/[projectId]/nav-groups';

interface Props {
  items: NavItem[];
  projectId: string;
  role: string;
}

export function SidebarCollapsedNav({ items, projectId, role }: Props) {
  const pathname = usePathname();

  return (
    <div className="space-y-0.5">
      {items.map(item => {
        const href = `/projects/${projectId}${item.href}`;
        const active = pathname === href || pathname.startsWith(href + '/');
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
  );
}
