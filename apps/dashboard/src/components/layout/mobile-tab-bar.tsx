'use client';

/**
 * MobileTabBar — bottom navigation for mobile (< md / 768px).
 *
 * Shows the top-priority nav items (Services, Databases, Storage, Logs) as tabs,
 * plus a "More" button that opens a bottom sheet listing all remaining items.
 */
import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { HugeiconsIcon } from '@hugeicons/react';
import { MoreHorizontalIcon, Close, Checkmark } from '@hugeicons/core-free-icons';

import { NAV_GROUPS, MOBILE_PRIORITY_IDS, type NavItem } from './project-sidebar';
import type { Project } from '@/types';

// Flatten all items from groups
const ALL_ITEMS = NAV_GROUPS.flatMap(g => g.items);

interface MobileTabBarProps {
  project: Project;
}

export function MobileTabBar({ project }: MobileTabBarProps) {
  const pathname = usePathname();
  const [showMore, setShowMore] = useState(false);
  const role = (project.role ?? 'viewer').toLowerCase();

  const priorityItems = MOBILE_PRIORITY_IDS
    .map(id => ALL_ITEMS.find(item => item.id === id))
    .filter((item): item is NavItem => !!item);

  const moreItems = ALL_ITEMS.filter(
    item => !MOBILE_PRIORITY_IDS.includes(item.id) &&
    (!item.adminOnly || ['owner', 'admin'].includes(role)),
  );

  function isActive(itemHref: string): boolean {
    const fullPath = `/projects/${project.id}${itemHref}`;
    return pathname === fullPath || pathname.startsWith(fullPath + '/');
  }

  function isActiveSection(itemId: string): boolean {
    return pathname.includes(`/${itemId}`);
  }

  function handleNavClick(item: NavItem) {
    if (item.adminOnly && !['owner', 'admin'].includes(role)) return;
    setShowMore(false);
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
              onClick={e => {
                if (locked) e.preventDefault();
              }}
              className={`
                flex flex-col items-center justify-center flex-1 py-2 px-1 rounded-lg transition-all min-w-[64px]
                ${active
                  ? 'text-[var(--accent)]'
                  : locked
                    ? 'text-[var(--text-dim)] opacity-50 cursor-not-allowed'
                    : 'text-[var(--text-muted)]'
                }
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
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setShowMore(false)}
            aria-hidden="true"
          />
          {/* Sheet */}
          <div
            role="dialog"
            aria-modal="true"
            aria-label="All sections"
            className="absolute bottom-0 inset-x-0 bg-[var(--surface)] border-t border-[var(--rail)] rounded-t-2xl shadow-2xl shadow-black/50"
            style={{ paddingBottom: 'max(1.5rem, env(safe-area-inset-bottom))' }}
          >
            {/* Drag handle */}
            <div className="flex justify-center pt-3 pb-2">
              <div className="w-10 h-1 rounded-full bg-[var(--rail-light)]" />
            </div>

            {/* Header */}
            <div className="px-5 pb-4 flex items-center justify-between border-b border-[var(--rail)]">
              <h3 className="text-base font-semibold text-[var(--text)]">All Sections</h3>
              <button
                onClick={() => setShowMore(false)}
                className="flex items-center justify-center w-8 h-8 rounded-full text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--hover)] transition-colors"
                aria-label="Close"
              >
                <HugeiconsIcon icon={Close} size={18} />
              </button>
            </div>

            {/* Sections grid */}
            <div className="px-5 py-4 grid grid-cols-3 gap-3">
              {moreItems.map(item => {
                const active = isActive(item.href);
                const locked = item.adminOnly && !['owner', 'admin'].includes(role);

                return (
                  <Link
                    key={item.id}
                    href={locked ? '#' : `/projects/${project.id}${item.href}`}
                    onClick={e => {
                      if (locked) e.preventDefault();
                      else handleNavClick(item);
                    }}
                    className={`
                      flex flex-col items-center justify-center p-3 rounded-xl transition-all
                      ${active
                        ? 'bg-[var(--accent)]/15 text-[var(--accent)]'
                        : locked
                          ? 'text-[var(--text-dim)] opacity-50 cursor-not-allowed'
                          : 'text-[var(--text-muted)] hover:bg-[var(--hover)]'
                      }
                    `}
                  >
                    <div className="relative">
                      <HugeiconsIcon
                        icon={item.icon}
                        size={24}
                        className={active ? 'text-[var(--accent)]' : 'text-[var(--text-dim)]'}
                      />
                      {active && (
                        <HugeiconsIcon
                          icon={Checkmark}
                          size={12}
                          className="absolute -bottom-0.5 -right-0.5 text-[var(--accent)]"
                        />
                      )}
                    </div>
                    <span className="text-xs font-medium mt-2 text-center">{item.label}</span>
                    {item.adminOnly && (
                      <span className="text-[9px] text-[var(--text-dim)] mt-0.5">Admin</span>
                    )}
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
