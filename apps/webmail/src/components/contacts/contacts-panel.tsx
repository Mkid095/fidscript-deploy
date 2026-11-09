'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

import { Card, EmptyState } from '@/components/ui';

interface Contact {
  id: string;
  displayName: string;
  email: string;
  organization: string;
}

/**
 * The address book, as Stalwart keeps it for this account.
 *
 * Read-only for now: Stalwart owns the cards, and writing new ones is the
 * contacts-capability work (phase 5). The list is real — every entry is a
 * card Stalwart returned for this account, and an empty book says so
 * plainly.
 */
export function ContactsPanel({ email }: { email: string }) {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/contacts')
      .then((response) => response.json())
      .then((body: { contacts?: Contact[]; error?: string }) => {
        if (body.error) setError(body.error);
        setContacts(body.contacts ?? []);
      })
      .catch((err) => setError((err as Error).message))
      .finally(() => setLoading(false));
  }, []);

  return (
    <main className="mx-auto max-w-3xl px-4 py-8">
      <h1 className="text-xl font-semibold text-text">Contacts</h1>
      <p className="mt-1 text-sm text-text-muted">
        The address book for {email}, kept at Stalwart.
      </p>

      {error ? (
        <p className="mt-4 text-sm text-danger">
          The address book did not come back: {error}
        </p>
      ) : null}

      <div className="mt-4">
        {loading ? (
          <p className="text-sm text-text-dim">Loading…</p>
        ) : contacts.length === 0 ? (
          <EmptyState
            title="No contacts yet"
            body="The address book is empty. Cards you add on other clients with CardDAV appear here."
          />
        ) : (
          <Card>
            <ul className="divide-y divide-rail">
              {contacts.map((contact) => (
                <li key={contact.id} className="flex items-center gap-3 py-2.5">
                  <div className="flex size-9 items-center justify-center rounded-full bg-accent-soft text-sm font-medium text-accent">
                    {(contact.displayName[0] ?? '?').toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm text-text">
                      {contact.displayName}
                      {contact.organization ? (
                        <span className="text-text-dim"> · {contact.organization}</span>
                      ) : null}
                    </p>
                    <p className="truncate text-xs text-text-dim">{contact.email}</p>
                  </div>
                  <a
                    href={`mailto:${contact.email}`}
                    className="text-xs text-accent hover:underline"
                  >
                    Write
                  </a>
                </li>
              ))}
            </ul>
          </Card>
        )}
      </div>

      <div className="mt-6">
        <Link href="/mail/inbox" className="text-sm text-accent hover:underline">
          Back to the inbox
        </Link>
      </div>
    </main>
  );
}
