'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { groupMenuItems, type MenuItem } from '@/lib/project/menu';

/**
 * The project's sidebar.
 *
 * The items are **derived** — from the project's shape, its capabilities and
 * what it actually has — and they are filtered by what this person may use.
 * A menu item a person cannot use is hidden, not greyed out.
 *
 * It is a column of its own: the head stays, the menu scrolls inside it,
 * and the foot stays. Nothing in it is ever half off the screen.
 */
export function ProjectSidebar({
  projectName,
  projectStatus,
  items,
}: {
  projectName: string;
  projectStatus: string;
  items: MenuItem[];
}) {
  const pathname = usePathname();
  const groups = groupMenuItems(items);

  return (
    <aside className="flex h-screen w-64 flex-shrink-0 flex-col border-r border-rail bg-surface">
      {/* The head: which project this is. */}
      <div className="flex-shrink-0 border-b border-rail px-4 py-4">
        <Link
          href="/projects"
          className="inline-flex items-center gap-1 text-xs text-text-dim transition-colors hover:text-text"
        >
          <span aria-hidden>←</span> All projects
        </Link>
        <p
          className="mt-2 truncate text-sm font-semibold text-text"
          title={projectName}
        >
          {projectName}
        </p>
        <p className="mt-0.5 text-[11px] uppercase tracking-wider text-text-dim">
          {projectStatus.toLowerCase()}
        </p>
      </div>

      {/* The menu: it scrolls, on its own. */}
      <nav
        aria-label="Project"
        className="scroll-area flex-1 overflow-y-auto overscroll-contain px-3 py-4"
      >
        {groups.map((group) => (
          <div key={group.label} className="mb-5 last:mb-0">
            <p className="mb-1.5 px-3 text-[11px] font-semibold uppercase tracking-wider text-text-dim">
              {group.label}
            </p>
            <ul className="space-y-0.5">
              {group.items.map((item) => {
                const active = pathname === item.href;
                return (
                  <li key={item.id}>
                    <Link
                      href={item.href}
                      aria-current={active ? 'page' : undefined}
                      className={`relative flex items-center rounded-md py-1.5 pl-3 pr-2 text-sm transition-colors ${
                        active
                          ? 'bg-surface-3 font-medium text-text'
                          : 'text-text-muted hover:bg-surface-2 hover:text-text'
                      }`}
                    >
                      {/* The mark that says "you are here". */}
                      <span
                        aria-hidden
                        className={`absolute left-0 top-1/2 h-4 w-0.5 -translate-y-1/2 rounded-full ${
                          active ? 'bg-accent' : 'bg-transparent'
                        }`}
                      />
                      <span className="truncate">{item.label}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      {/* The foot: the way back to the platform. */}
      <div className="flex-shrink-0 border-t border-rail px-4 py-3">
        <Link
          href="/overview"
          className="text-xs text-text-dim transition-colors hover:text-text"
        >
          Platform overview
        </Link>
      </div>
    </aside>
  );
}
