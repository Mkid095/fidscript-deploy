'use client';

/**
 * MobileTabBar — bottom navigation for mobile (< md / 768px).
 *
 * Replaces the desktop sidebar on small screens. Shows the top-priority nav
 * items (Services, Databases, Storage, Logs) as direct tabs, plus a "More"
 * button that opens a bottom sheet listing all remaining items.
 *
 * Hidden on >= md (the ProjectSidebar takes over there). Rendered by the
 * project layout alongside the sidebar.
 */
import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { HugeiconsIcon } from '@hugeicons/react';
import { MoreHorizontalIcon } from '@hugeicons/core-free-icons';

import { NAV_ITEMS, MOBILE_PRIORITY_IDS, type NavItem } from './project-sidebar';
import type { Project } from '@/types';

const MORE_LABEL = 'More';

interface MobileTabBarProps {
  project: Project;
}

export function MobileTabBar({ project }: MobileTabBarProps) {
  const pathname = usePathname();
  const [showMore, setShowMore] = useState(false);

  const priorityItems = MOBILE_PRIORITY_IDS
    .map(id => NAV_ITEMS.find(item => item.id === id))
    .filter((item): item is NavItem => !!item);
  const moreItems = NAV_ITEMS.filter(item => !MOBILE_PRIORITY_IDS.includes(item.id));

  function isActive(href: string): boolean {
    const fullPath = `/projects/${project.id}/${href}`;
    return pathname === fullPath || pathname.startsWith(fullPath + '/');
  }

  function isLocked(item: NavItem): boolean {
    const role = (project.role ?? 'viewer').toLowerCase();
    return Boolean(
      (item.adminOnly && !['owner', 'admin'].includes(role)) ||
      (item.ownerOnly && role !== 'owner'),
    );
  }

  function renderItem(item: NavItem) {
    const active = isActive(item.href);
    const locked = isLocked(item);
    const href = locked ? '#' : `/projects/${project.id}/${item.href}`;

    return (
      <Link
        key={item.id}
        href={href}
        onClick={e => locked && e.preventDefault()}
        className={`flex flex-col items-center justify-center gap-0.5 py-1.5 px-1 rounded-md transition-colors min-w-[56px] ${
          active ? 'text-[var(--accent)]' : locked ? 'text-[var(--text-dim)]' : 'text-[var(--text-muted)]'
        }`}
        aria-label={item.label}
        aria-current={active ? 'page' : undefined}
      >
        <HugeiconsIcon
          icon={item.icon}
          size={18}
          className={active ? 'text-[var(--accent)]' : 'text-[var(--text-dim)]'}
        />
        <span className="text-[9px] font-medium leading-none truncate max-w-[64px]">{item.label}</span>
      </Link>
    );
  }

  return (
    <>
      {/* Bottom bar */}
      <nav
        aria-label="Mobile navigation"
        className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-[var(--surface)]/95 backdrop-blur-sm border-t border-[var(--rail)] flex items-stretch justify-around px-1"
        style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
      >
        {priorityItems.map(renderItem)}

        {/* More button */}
        <button
          onClick={() => setShowMore(true)}
          className={`flex flex-col items-center justify-center gap-0.5 py-1.5 px-1 rounded-md transition-colors min-w-[56px] ${
            showMore ? 'text-[var(--accent)]' : 'text-[var(--text-muted)]'
          }`}
          aria-label={MORE_LABEL}
          aria-expanded={showMore}
        >
          <HugeiconsIcon icon={MoreHorizontalIcon} size={18} className={showMore ? 'text-[var(--accent)]' : 'text-[var(--text-dim)]'} />
          <span className="text-[9px] font-medium leading-none">{MORE_LABEL}</span>
        </button>
      </nav>

      {/* "More" bottom sheet */}
      {showMore && (
        <div className="md:hidden fixed inset-0 z-50">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-in fade-in"
            onClick={() => setShowMore(false)}
            aria-hidden="true"
          />
          {/* Sheet */}
          <div
            role="dialog"
            aria-modal="true"
            aria-label="All navigation items"
            className="absolute bottom-0 inset-x-0 bg-[var(--surface)] border-t border-[var(--rail)] rounded-t-2xl pb-2 animate-in slide-in-from-bottom"
            style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 0.5rem)' }}
          >
            {/* Drag handle */}
            <div className="flex justify-center pt-2 pb-1">
              <div className="w-10 h-1 rounded-full bg-[var(--rail-light)]" />
            </div>
            <div className="px-3 pt-1 pb-2 flex items-center justify-between">
              <h3 className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">All sections</h3>
              <button
                onClick={() => setShowMore(false)}
                className="text-xs text-[var(--text-muted)] hover:text-[var(--text-muted)]"
              >
                Close
              </button>
            </div>
            <div className="grid grid-cols-4 gap-1 px-2">
              {moreItems.map(item => {
                const active = isActive(item.href);
                const locked = isLocked(item);
                const href = locked ? '#' : `/projects/${project.id}/${item.href}`;
                return (
                  <Link
                    key={item.id}
                    href={href}
                    onClick={e => { if (locked) e.preventDefault(); else setShowMore(false); }}
                    className={`flex flex-col items-center justify-center gap-1 py-3 px-1 rounded-lg transition-colors ${
                      active ? 'bg-[var(--accent)]/10 text-[var(--accent)]' : locked ? 'text-[var(--text-dim)]' : 'text-[var(--text-muted)] hover:bg-[var(--rail)]'
                    }`}
                  >
                    <HugeiconsIcon icon={item.icon} size={18} className={active ? 'text-[var(--accent)]' : 'text-[var(--text-dim)]'} />
                    <span className="text-[10px] font-medium leading-none truncate max-w-[72px]">{item.label}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
