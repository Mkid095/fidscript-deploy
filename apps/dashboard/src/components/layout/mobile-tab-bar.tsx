'use client';

/**
 * MobileTabBar — bottom navigation for mobile (< md / 768px).
 *
 * Renders mode-appropriate nav items (Deploy or BaaS) and a "More" button
 * that opens a bottom sheet with all remaining items.
 */
import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { HugeiconsIcon } from '@hugeicons/react';
import { MoreHorizontalIcon } from '@hugeicons/core-free-icons';

import { getNavGroups, getMobilePriorityIds, type NavItem } from '@/app/(app)/projects/[projectId]/nav-groups';
import { MobileTabBarSheet } from './mobile-tab-bar-sheet';
import type { Project } from '@/types';
import type { ProjectMode } from '@/app/(app)/projects/[projectId]/use-project-mode';

interface MobileTabBarProps {
  project: Project;
  mode: ProjectMode;
}

export function MobileTabBar({ project, mode }: MobileTabBarProps) {
  const pathname = usePathname();
  const [showMore, setShowMore] = useState(false);
  const role = (project.role ?? 'viewer').toLowerCase();
  const navGroups = getNavGroups(mode);
  const priorityIds = getMobilePriorityIds(mode);
  const allItems = navGroups.flatMap(g => g.items);

  const priorityItems = priorityIds
    .map(id => allItems.find(item => item.id === id))
    .filter((item): item is NavItem => !!item);

  const moreItems = allItems.filter(
    item => !priorityIds.includes(item.id) &&
    (!item.adminOnly || ['owner', 'admin'].includes(role)),
  );

  function isActive(itemHref: string): boolean {
    const fullPath = `/projects/${project.id}${itemHref}`;
    return pathname === fullPath || pathname.startsWith(fullPath + '/');
  }

  return (
    <>
      {/* Bottom bar */}
      <nav
        aria-label="Mobile navigation"
        className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-[var(--surface)]/95 backdrop-blur-lg border-t border-[var(--rail)] flex items-stretch justify-around px-2 pt-1"
        style={{ paddingBottom: 'max(0.5rem, env(safe-area-inset-bottom))' }}
      >
        {priorityItems.map(item => {
          const active = isActive(item.href);
          const locked = item.adminOnly && !['owner', 'admin'].includes(role);
          const href = locked ? '#' : `/projects/${project.id}${item.href}`;

          return (
            <Link
              key={item.id}
              href={href}
              onClick={e => { if (locked) e.preventDefault(); }}
              className={`
                relative flex flex-col items-center justify-center flex-1 py-2 px-1 rounded-lg transition-all min-w-[64px]
                ${active ? 'text-[var(--accent)]'
                  : locked ? 'text-[var(--text-dim)] opacity-50 cursor-not-allowed'
                  : 'text-[var(--text-muted)]'}
              `}
              aria-label={item.label}
              aria-current={active ? 'page' : undefined}
            >
              <HugeiconsIcon
                icon={item.icon}
                size={22}
                className={active ? 'text-[var(--accent)]' : 'text-[var(--text-dim)]'}
              />
              <span className="text-[10px] font-medium leading-tight mt-1.5">{item.label}</span>
              {active && (
                <span className="absolute top-1 w-1 h-1 rounded-full bg-[var(--accent)]" />
              )}
            </Link>
          );
        })}

        {/* More button */}
        <button
          onClick={() => setShowMore(true)}
          className={`
            flex flex-col items-center justify-center flex-1 py-2 px-1 rounded-lg transition-all min-w-[64px]
            ${showMore ? 'text-[var(--accent)]' : 'text-[var(--text-muted)]'}
          `}
          aria-label="More options"
          aria-expanded={showMore}
        >
          <HugeiconsIcon icon={MoreHorizontalIcon} size={22} className={showMore ? 'text-[var(--accent)]' : 'text-[var(--text-dim)]'} />
          <span className="text-[10px] font-medium leading-tight mt-1.5">More</span>
        </button>
      </nav>

      {/* "More" bottom sheet */}
      {showMore && (
        <div className="md:hidden fixed inset-0 z-50">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setShowMore(false)}
            aria-hidden="true"
          />
          <MobileTabBarSheet
            items={moreItems}
            projectId={project.id}
            role={role}
            onClose={() => setShowMore(false)}
          />
        </div>
      )}
    </>
  );
}
