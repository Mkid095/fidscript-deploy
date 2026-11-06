'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { PLATFORM_NAV, isPlatformNavActive } from '@/navigation/platform-nav';

/**
 * The platform's navigation.
 *
 * Four destinations, and they are the ones that are not a project's: the
 * overview, the projects, the applications the platform can have, and the
 * operator's own settings. A project's resources are in the project
 * console — the two levels stay apart.
 */
export function PlatformNav() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Platform"
      className="flex items-center gap-1 px-1 py-1 rounded-lg bg-[var(--surface)] border border-[var(--rail)]"
    >
      {PLATFORM_NAV.map((item) => {
        const active = isPlatformNavActive(item.href, pathname);
        return (
          <Link
            key={item.href}
            href={item.href}
            title={item.hint}
            aria-current={active ? 'page' : undefined}
            className={`rounded-lg px-3 py-1.5 text-xs transition-colors ${
              active
                ? 'bg-[var(--rail)] text-[var(--text)]'
                : 'text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--rail)]'
            }`}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
