/**
 * The client's folder model.
 *
 * The rail's seven standard folders map onto Stalwart's mailbox roles; the
 * rest of the account's mailboxes are custom folders. Everything here is a
 * pure function of the mailbox list, so a screen gets the labels, counts,
 * query params and move targets from one place.
 */

import type { Mailbox } from './types';

export interface SystemFolder {
  /** The URL slug and the rail's id. */
  key: string;
  label: string;
  /** The Stalwart role to find the mailbox by; `starred` has none. */
  role: string | null;
}

export const SYSTEM_FOLDERS: SystemFolder[] = [
  { key: 'inbox', label: 'Inbox', role: 'inbox' },
  { key: 'starred', label: 'Starred', role: null },
  { key: 'sent', label: 'Sent', role: 'sent' },
  { key: 'drafts', label: 'Drafts', role: 'drafts' },
  { key: 'archive', label: 'Archive', role: 'archive' },
  { key: 'spam', label: 'Spam', role: 'junk' },
  { key: 'trash', label: 'Trash', role: 'trash' },
];

const slugify = (name: string) =>
  name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

/** The mailbox behind a standard folder key, or undefined (starred). */
export function findSystemMailbox(
  mailboxes: Mailbox[],
  key: string,
): Mailbox | undefined {
  const spec = SYSTEM_FOLDERS.find((f) => f.key === key);
  if (!spec?.role) return undefined;
  // This Stalwart build reports the inbox's role as "inbox", not the
  // RFC-standard "all" — accept whichever it answers with.
  return (
    mailboxes.find((m) => m.role === spec.role) ??
    (spec.role === 'inbox' ? mailboxes.find((m) => m.role === 'all') : undefined)
  );
}

/**
 * Resolve the URL slug to what it is: a standard folder key, or a custom
 * folder (by "id-<mailbox id>" or its slugified name).
 */
export function resolveSlug(
  mailboxes: Mailbox[],
  slug: string,
):
  | { kind: 'system'; key: string }
  | { kind: 'custom'; mailbox: Mailbox }
  | null {
  const system = SYSTEM_FOLDERS.find((f) => f.key === slug);
  if (system) return { kind: 'system', key: system.key };
  if (slug.startsWith('id-')) {
    const match = mailboxes.find((m) => m.id === slug.slice(3));
    return match ? { kind: 'custom', mailbox: match } : null;
  }
  const match = mailboxes.find((m) => slugify(m.name) === slug);
  return match ? { kind: 'custom', mailbox: match } : null;
}

/** The mailboxes that are not one of the standard seven. */
export function customFolders(mailboxes: Mailbox[]): Mailbox[] {
  const systemIds = new Set(
    SYSTEM_FOLDERS.map((f) => findSystemMailbox(mailboxes, f.key)?.id).filter(
      Boolean,
    ),
  );
  return mailboxes.filter((m) => !systemIds.has(m.id));
}

/**
 * What a query for this folder asks of /api/mail/query. `starred` is the
 * whole account — its flagging is the app's business, the way every other
 * narrowing is on this Stalwart build.
 */
export function queryForSlug(
  mailboxes: Mailbox[],
  slug: string,
): { mailbox: string } | null {
  const resolved = resolveSlug(mailboxes, slug);
  if (!resolved) return null;
  if (resolved.kind === 'system') {
    if (resolved.key === 'starred') return { mailbox: 'all' };
    const box = findSystemMailbox(mailboxes, resolved.key);
    return box ? { mailbox: box.id } : null;
  }
  return { mailbox: resolved.mailbox.id };
}

/** The rail's unread count for a standard folder, from the mailbox list. */
export function unreadCount(mailboxes: Mailbox[], key: string): number {
  if (key !== 'inbox') return 0;
  return findSystemMailbox(mailboxes, 'inbox')?.unreadEmails ?? 0;
}

/** The total count for a standard folder that has a mailbox behind it. */
export function totalCount(mailboxes: Mailbox[], key: string): number {
  return findSystemMailbox(mailboxes, key)?.totalEmails ?? 0;
}

/** Where a "move to…" menu can send a message. */
export function moveDestinations(mailboxes: Mailbox[]): Array<{
  id: string;
  name: string;
}> {
  const wanted = ['inbox', 'archive', 'junk', 'trash'];
  const rows = wanted
    .map((role) => {
      const box =
        mailboxes.find((m) => m.role === role) ??
        (role === 'inbox' ? mailboxes.find((m) => m.role === 'all') : undefined);
      return box ? { id: box.id, name: box.name } : null;
    })
    .filter((r): r is { id: string; name: string } => r !== null);
  const taken = new Set(rows.map((r) => r.id));
  return [...rows, ...customFolders(mailboxes).filter((m) => !taken.has(m.id))];
}

/** The URL slug for a custom mailbox (the rail's and the router's form). */
export function customSlug(mailbox: Mailbox): string {
  return `id-${mailbox.id}`;
}

/** A human title for the list pane's heading, from the slug. */
export function folderTitle(mailboxes: Mailbox[], slug: string): string {
  const resolved = resolveSlug(mailboxes, slug);
  if (!resolved) return slug;
  if (resolved.kind === 'system') {
    return SYSTEM_FOLDERS.find((f) => f.key === resolved.key)!.label;
  }
  return resolved.mailbox.name;
}

/** Is this the trash view, where "delete" means destroy and Empty lives? */
export function isTrashSlug(mailboxes: Mailbox[], slug: string): boolean {
  const resolved = resolveSlug(mailboxes, slug);
  return resolved?.kind === 'system' && resolved.key === 'trash';
}
