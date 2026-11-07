'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';

/**
 * The account menu.
 *
 * The applications and the keys live **here**, not in the top bar: they are
 * settings, and a setting is not a destination a person returns to.
 */
export function AccountMenu({ name, email }: { name: string | null; email: string }) {
  const router = useRouter();

  async function signOut() {
    await fetch('/api/v1/auth/logout', { method: 'POST' });
    router.replace('/login');
    router.refresh();
  }

  const initials = (name ?? email).slice(0, 2).toUpperCase();

  return (
    <details className="group relative">
      <summary className="flex cursor-pointer list-none items-center gap-2 rounded-md border border-rail px-2 py-1.5 text-sm text-text-muted transition-colors hover:border-rail-light hover:text-text">
        <span className="flex size-6 items-center justify-center rounded-full bg-surface-3 text-[11px] font-semibold text-text">
          {initials}
        </span>
        <span className="hidden sm:inline">{name ?? email}</span>
      </summary>

      <div className="absolute right-0 z-50 mt-2 w-56 rounded-lg border border-rail bg-surface p-1 shadow-lg">
        <div className="border-b border-rail px-3 py-2">
          <p className="truncate text-sm text-text">{name ?? email}</p>
          <p className="truncate text-xs text-text-dim">{email}</p>
        </div>

        <nav className="py-1">
          <MenuLink href="/settings">Account settings</MenuLink>
          <MenuLink href="/settings/applications">Applications</MenuLink>
          <MenuLink href="/settings/api-keys">API keys &amp; MCP</MenuLink>
          <MenuLink href="/docs">Documentation</MenuLink>
        </nav>

        <div className="border-t border-rail pt-1">
          <button
            type="button"
            onClick={signOut}
            className="w-full rounded-md px-3 py-2 text-left text-sm text-danger transition-colors hover:bg-surface-2"
          >
            Sign out
          </button>
        </div>
      </div>
    </details>
  );
}

function MenuLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="block rounded-md px-3 py-2 text-sm text-text-muted transition-colors hover:bg-surface-2 hover:text-text"
    >
      {children}
    </Link>
  );
}
