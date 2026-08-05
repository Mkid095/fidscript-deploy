'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { HugeiconsIcon } from '@hugeicons/react';
import { ArrowRight01Icon } from '@hugeicons/core-free-icons';

import type { NavItem } from '@/app/(app)/projects/[projectId]/nav-groups';

interface Props {
  items: NavItem[];
  projectId: string;
  role: string;
}

export function SidebarExpandedNav({ items, projectId, role }: Props) {
  const pathname = usePathname();

  return (
    <div className="space-y-0.5">
      {items.map(item => {
        const href = `/projects/${projectId}${item.href}`;
        const active = pathname === href || pathname.startsWith(href + '/');

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
  );
}
