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
    <aside className="flex w-56 flex-shrink-0 flex-col border-r border-rail bg-surface">
      <div className="border-b border-rail px-4 py-3">
        <Link href="/projects" className="text-xs text-text-dim transition hover:text-text">
          ← All projects
        </Link>
        <p className="mt-1 truncate text-sm font-medium text-text">{projectName}</p>
        <p className="text-[11px] uppercase tracking-wide text-text-dim">{projectStatus}</p>
      </div>

      <nav aria-label="Project" className="flex-1 overflow-y-auto p-2">
        {groups.map((group) => (
          <div key={group.label} className="mb-4 last:mb-0">
            <p className="mb-1 px-2 text-[10px] font-semibold uppercase tracking-wider text-text-dim">
              {group.label}
            </p>
            {group.items.map((item) => {
              const active = pathname === item.href;
              return (
                <Link
                  key={item.id}
                  href={item.href}
                  aria-current={active ? 'page' : undefined}
                  className={`block rounded-md px-2 py-1.5 text-sm transition-colors ${
                    active
                      ? 'bg-surface-3 text-text'
                      : 'text-text-muted hover:bg-surface-2 hover:text-text'
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>
    </aside>
  );
}
