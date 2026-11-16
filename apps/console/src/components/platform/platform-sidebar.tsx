'use client';

import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { AccountMenu } from './account-menu';

/**
 * The platform's own navigation.
 *
 * A column on the left, the way the project console has one — so the
 * platform reads as a place you are, and not as a strip of links at the
 * top of a page.
 *
 * Three destinations, and the system itself: the overview, the projects,
 * the settings, and what the machine is doing.
 */
const SECTIONS = [
  { href: '/overview', label: 'Overview' },
  { href: '/projects', label: 'Projects' },
  { href: '/settings', label: 'Settings' },
  { href: '/system', label: 'System' },
];

export function PlatformSidebar({
  name,
  email,
}: {
  name: string | null;
  email: string;
}) {
  const pathname = usePathname();

  return (
    <aside className="flex h-screen w-60 flex-shrink-0 flex-col border-r border-rail bg-surface">
      {/* The head: what this is. */}
      <div className="flex-shrink-0 border-b border-rail px-4 py-4">
        <Link
          href="/overview"
          className="flex items-center gap-2.5"
          aria-label="FIDScript"
        >
          <Image
            src="/logo.png"
            alt=""
            width={24}
            height={24}
            className="rounded-md"
          />
          <span className="text-sm font-bold uppercase tracking-widest text-text">
            fidscript
          </span>
        </Link>
      </div>

      {/* The menu: it scrolls, on its own. */}
      <nav
        aria-label="Platform"
        className="scroll-area flex-1 overflow-y-auto overscroll-contain px-3 py-4"
      >
        <p className="mb-1.5 px-3 text-[11px] font-semibold uppercase tracking-wider text-text-dim">
          Platform
        </p>
        <ul className="space-y-0.5">
          {SECTIONS.map((section) => {
            const active =
              pathname === section.href ||
              pathname.startsWith(`${section.href}/`);
            return (
              <li key={section.href}>
                <Link
                  href={section.href}
                  aria-current={active ? 'page' : undefined}
                  className={`relative flex items-center rounded-md py-1.5 pl-3 pr-2 text-sm transition-colors ${
                    active
                      ? 'bg-surface-3 font-medium text-text'
                      : 'text-text-muted hover:bg-surface-2 hover:text-text'
                  }`}
                >
                  <span
                    aria-hidden
                    className={`absolute left-0 top-1/2 h-4 w-0.5 -translate-y-1/2 rounded-full ${
                      active ? 'bg-accent' : 'bg-transparent'
                    }`}
                  />
                  <span className="truncate">{section.label}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* The foot: who is here. */}
      <div className="flex-shrink-0 border-t border-rail px-4 py-3">
        <AccountMenu name={name} email={email} />
      </div>
    </aside>
  );
}
