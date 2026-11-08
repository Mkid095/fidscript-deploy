import Image from 'next/image';
import Link from 'next/link';

import { AccountMenu } from './account-menu';

/**
 * The platform's top bar.
 *
 * **Three items.** The applications and the keys are settings — a one-time
 * thing does not sit in a permanent menu — so they live in the account menu
 * and in the settings hub.
 */
const NAV = [
  { href: '/overview', label: 'Overview' },
  { href: '/projects', label: 'Projects' },
  { href: '/settings', label: 'Settings' },
];

export function TopBar({
  pathname,
  name,
  email,
}: {
  pathname: string;
  name: string | null;
  email: string;
}) {
  return (
    <header className="flex h-14 flex-shrink-0 items-center gap-4 border-b border-rail bg-surface px-4 sm:px-6">
      <Link
        href="/"
        className="flex items-center gap-2"
        aria-label="FIDScript home"
      >
        <Image
          src="/logo.png"
          alt=""
          width={28}
          height={28}
          className="rounded-md"
        />
        <span className="hidden text-sm font-bold uppercase tracking-widest text-text sm:inline">
          fidscript
        </span>
      </Link>

      <nav aria-label="Platform" className="flex items-center gap-1">
        {NAV.map((item) => {
          const active =
            pathname === item.href || pathname.startsWith(`${item.href}/`);
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? 'page' : undefined}
              className={`rounded-md px-3 py-1.5 text-sm transition-colors ${
                active
                  ? 'bg-surface-3 text-text'
                  : 'text-text-muted hover:text-text'
              }`}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="flex-1" />

      <AccountMenu name={name} email={email} />
    </header>
  );
}
