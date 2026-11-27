'use client';

import { useEffect, useMemo, useState } from 'react';
import { PenSquare, Search, Users } from 'lucide-react';

interface Contact {
  id: string;
  displayName: string;
  email: string;
  organization: string;
}

interface ContactsViewProps {
  email: string;
  /** Wired in-app: "write" opens the composer with the contact in To. */
  onWriteTo?: (contact: Contact) => void;
}

/**
 * The address book, as Stalwart keeps it for this account — searchable,
 * with a "write" that opens the composer in the app rather than leaving it.
 */
export function ContactsView({ email, onWriteTo }: ContactsViewProps) {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');

  useEffect(() => {
    let cancelled = false;
    fetch('/api/contacts')
      .then((res) => res.json())
      .then((body: { contacts?: Contact[]; error?: string }) => {
        if (cancelled) return;
        if (body.error) setError(body.error);
        setContacts(body.contacts ?? []);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : 'The address book did not come back.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return contacts;
    return contacts.filter(
      (c) =>
        c.displayName.toLowerCase().includes(q) ||
        c.email.toLowerCase().includes(q) ||
        (c.organization ?? '').toLowerCase().includes(q),
    );
  }, [contacts, query]);

  return (
    <div className="scroll-area h-full overflow-y-auto bg-slate-50 dark:bg-slate-950">
      <div className="mx-auto max-w-3xl space-y-6 p-5 sm:p-8">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            Contacts
          </h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            The address book for {email}, kept at Stalwart.
          </p>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by name, address, or organisation…"
            aria-label="Search contacts"
            className="min-h-[40px] w-full rounded-lg border border-slate-200 bg-white py-2 pl-10 pr-4 text-sm text-slate-900 transition-colors placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-orange-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
          />
        </div>

        {error && (
          <div
            role="alert"
            className="rounded-lg border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-xs font-medium text-rose-700 dark:border-rose-800 dark:bg-rose-950/40 dark:text-rose-300"
          >
            The address book did not come back: {error}
          </div>
        )}

        {loading ? (
          <p className="text-sm text-slate-400">Loading…</p>
        ) : contacts.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-300 bg-white/50 p-10 text-center dark:border-slate-700 dark:bg-slate-900/40">
            <Users className="mx-auto mb-3 h-8 w-8 text-slate-300 dark:text-slate-600" />
            <p className="font-display text-sm font-semibold text-slate-700 dark:text-slate-300">
              No contacts yet
            </p>
            <p className="mx-auto mt-1 max-w-xs text-xs text-slate-500 dark:text-slate-400">
              The address book is empty. Cards you add on other clients with
              CardDAV appear here.
            </p>
          </div>
        ) : shown.length === 0 ? (
          <p className="py-8 text-center text-sm text-slate-500 dark:text-slate-400">
            Nothing matches “{query}”.
          </p>
        ) : (
          <ul className="divide-y divide-slate-100 overflow-hidden rounded-xl border border-slate-200 bg-white dark:divide-slate-800/80 dark:border-slate-800 dark:bg-slate-900">
            {shown.map((contact) => (
              <li key={contact.id} className="flex items-center gap-3 px-4 py-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-orange-200 bg-orange-600/10 font-display text-xs font-bold text-orange-700 dark:border-orange-800 dark:bg-orange-500/20 dark:text-orange-300">
                  {(contact.displayName[0] ?? '?').toUpperCase()}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-slate-900 dark:text-white">
                    {contact.displayName}
                    {contact.organization ? (
                      <span className="text-slate-400"> · {contact.organization}</span>
                    ) : null}
                  </p>
                  <p className="truncate font-mono text-xs text-slate-500 dark:text-slate-400">
                    {contact.email}
                  </p>
                </div>
                {onWriteTo ? (
                  <button
                    type="button"
                    onClick={() => onWriteTo(contact)}
                    className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
                  >
                    <PenSquare className="h-3.5 w-3.5" />
                    <span>Write</span>
                  </button>
                ) : (
                  <a
                    href={`mailto:${contact.email}`}
                    className="shrink-0 text-xs font-medium text-orange-600 hover:underline dark:text-orange-400"
                  >
                    Write
                  </a>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
