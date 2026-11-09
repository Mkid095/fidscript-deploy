'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';

export interface RailMailbox {
  id: string;
  name: string;
  role: string | null;
  unreadEmails: number;
}

interface RailItem {
  href: string;
  label: string;
  unread: number;
  depth?: boolean;
}

/**
 * The mail shell: the folder rail on the left, the top bar, and the page
 * content the layout gives it. The rail is computed from the mailboxes
 * Stalwart actually has for this account — standard folders by their
 * roles, custom ones by name. The active folder is the browser's own
 * address.
 */
export function MailShell({
  email,
  mailboxes,
  children,
}: {
  email: string;
  mailboxes: RailMailbox[];
  children: ReactNode;
}) {
  const pathname = usePathname();
  const byRole = (role: string | null) =>
      mailboxes.find((m) => m.role === role) ??
      (role === 'all' ? mailboxes.find((m) => m.role === 'inbox') : undefined);

  const rail: RailItem[] = [];
  const inbox = byRole('all');
  if (inbox) rail.push({ href: '/mail/inbox', label: 'Inbox', unread: inbox.unreadEmails });
  rail.push({ href: '/mail/starred', label: 'Starred', unread: 0 });
  const sent = byRole('sent');
  if (sent) rail.push({ href: '/mail/sent', label: 'Sent', unread: 0 });
  const drafts = byRole('drafts');
  if (drafts) rail.push({ href: '/mail/drafts', label: 'Drafts', unread: 0 });
  const spam = byRole('junk');
  if (spam) rail.push({ href: '/mail/spam', label: 'Spam', unread: spam.unreadEmails });
  const trash = byRole('trash');
  if (trash) rail.push({ href: '/mail/trash', label: 'Trash', unread: 0 });
  const archive = byRole('archive');
  if (archive) rail.push({ href: '/mail/archive', label: 'Archive', unread: 0 });

  const standardRoles = new Set(['all', 'inbox', 'sent', 'drafts', 'junk', 'trash', 'archive']);
  const custom = mailboxes.filter((m) => !standardRoles.has(m.role ?? ''));
  if (custom.length) {
    rail.push({ href: '#', label: 'Folders', unread: 0 });
    for (const folder of custom) {
      const slug =
        folder.name
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-|-$/g, '') || `id-${folder.id}`;
      rail.push({
        href: `/mail/${slug}`,
        label: folder.name,
        unread: folder.unreadEmails,
        depth: true,
      });
    }
  }

  return (
    <div className="flex min-h-screen">
      <aside className="w-56 shrink-0 border-r border-rail bg-surface">
        <div className="border-b border-rail p-3">
          <Link
            href="/compose"
            className="block w-full rounded bg-accent px-3 py-2 text-center text-sm font-medium text-white transition-opacity hover:opacity-90"
          >
            Compose
          </Link>
        </div>
        <nav className="p-2">
          {rail.map((item) => {
            if (item.href === '#') {
              return (
                <p
                  key="folders"
                  className="px-2 pb-1 pt-3 text-[11px] font-semibold uppercase tracking-wide text-text-dim"
                >
                  {item.label}
                </p>
              );
            }
            const isHere = pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center justify-between rounded px-2 py-1.5 text-sm transition-colors ${
                  isHere
                    ? 'bg-accent-soft font-medium text-accent'
                    : 'text-text-muted hover:bg-surface-2 hover:text-text'
                } ${item.depth ? 'pl-4' : ''}`}
              >
                <span>{item.label}</span>
                {item.unread > 0 ? (
                  <span className="rounded bg-accent-soft px-1.5 text-xs font-medium text-accent">
                    {item.unread}
                  </span>
                ) : null}
              </Link>
            );
          })}
        </nav>
        <div className="space-y-1 border-t border-rail p-2">
          <Link
            href="/contacts"
            className="block rounded px-2 py-1.5 text-sm text-text-muted hover:bg-surface-2 hover:text-text"
          >
            Contacts
          </Link>
          <Link
            href="/settings"
            className="block rounded px-2 py-1.5 text-sm text-text-muted hover:bg-surface-2 hover:text-text"
          >
            Settings
          </Link>
          <Link
            href="/"
            className="block rounded px-2 py-1.5 text-sm text-text-muted hover:bg-surface-2 hover:text-text"
          >
            Dashboard
          </Link>
        </div>
      </aside>

      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between border-b border-rail bg-surface px-4 py-2">
          <span className="truncate font-mono text-xs text-text-dim">{email}</span>
          <form action="/mail/search" method="get" className="flex w-72">
            <input
              type="search"
              name="q"
              placeholder="Search all mail…"
              className="w-full rounded border border-rail bg-surface px-3 py-1.5 text-sm outline-none focus:border-rail-light"
            />
          </form>
        </div>
        <main className="p-4">{children}</main>
      </div>
    </div>
  );
}
