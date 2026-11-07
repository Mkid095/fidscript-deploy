'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

/**
 * The settings' own navigation.
 *
 * The applications and the keys live here, not in the top bar: they are
 * settings, and a setting is not a destination a person returns to.
 */
const SECTIONS = [
  { href: '/settings', label: 'Account' },
  { href: '/settings/applications', label: 'Applications' },
  { href: '/settings/api-keys', label: 'API keys & MCP' },
  { href: '/settings/integrations', label: 'Integrations' },
];

export function SettingsNav() {
  const pathname = usePathname();

  return (
    <nav aria-label="Settings" className="flex gap-1 overflow-x-auto border-b border-rail pb-px">
      {SECTIONS.map((section) => {
        const active =
          section.href === '/settings'
            ? pathname === '/settings'
            : pathname.startsWith(section.href);
        return (
          <Link
            key={section.href}
            href={section.href}
            aria-current={active ? 'page' : undefined}
            className={`whitespace-nowrap rounded-t-md px-3 py-2 text-sm transition-colors ${
              active
                ? 'border-b-2 border-accent text-text'
                : 'border-b-2 border-transparent text-text-muted hover:text-text'
            }`}
          >
            {section.label}
          </Link>
        );
      })}
    </nav>
  );
}
