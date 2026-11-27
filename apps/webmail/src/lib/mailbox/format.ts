/**
 * The formatters the mailbox screens share — ported from the reference
 * design's utils, with one addition: a monogram for a person, which falls
 * back to the address's local part when no display name exists.
 */

import type { Person } from './types';

/** "09:41" today, "Nov 24" this year, "Nov 24, 2025" older — the list's stamp. */
export function formatEmailTimestamp(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  const now = new Date();
  const sameDay =
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate();

  if (sameDay) {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }
  const sameYear = date.getFullYear() === now.getFullYear();
  return date.toLocaleDateString([], {
    month: 'short',
    day: 'numeric',
    ...(sameYear ? {} : { year: 'numeric' }),
  });
}

/** "Thu, Nov 24, 2026 at 09:41" — the detail pane's stamp. */
export function formatFullTimestamp(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleString([], {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/** "FIDScript Team" → "FT"; "ken" → "KE". */
export function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return 'FS';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

/** The avatar's letters: the name's initials, the address's otherwise. */
export function initialsFor(person: Person | null): string {
  if (!person) return '?';
  const source =
    person.name && person.name.trim() ? person.name : person.email;
  const local = source.split('@')[0] || source;
  return getInitials(local);
}

/** "1.2 MB" and friends, for attachment tiles. */
export function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return 'File';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

/** The list's "To:" line, comma-joined. */
export function addressList(people: Array<Person | null>): string {
  return people
    .filter((p): p is Person => p !== null)
    .map((p) => p.name?.trim() ? `${p.name} <${p.email}>` : p.email)
    .join(', ');
}
