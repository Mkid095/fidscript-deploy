'use client';

import Link from 'next/link';

interface TopNavLinkProps {
  href: string;
  pathname: string | null;
  children: React.ReactNode;
}

/** One link in the top bar. The current page is marked, not just styled. */
export function TopNavLink({ href, pathname, children }: TopNavLinkProps) {
  const active = pathname === href;
  return (
    <Link
      href={href}
      aria-current={active ? 'page' : undefined}
      className={`rounded-lg px-3 py-1.5 text-xs transition-colors ${
        active
          ? 'bg-[var(--rail)] text-[var(--text)]'
          : 'text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--rail)]'
      }`}
    >
      {children}
    </Link>
  );
}
