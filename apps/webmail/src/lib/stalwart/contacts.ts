/**
 * The contacts, over JMAP's `urn:ietf:params:jmap:contacts`.
 *
 * Stalwart owns the address book; we read it as the user and render it.
 * An account with no contacts answers with an empty book, not an error.
 */
import { userClient } from '@/lib/stalwart/jmap';
import type { Credential } from '@/lib/stalwart/mail';

const CONTACTS_USING = [
  'urn:ietf:params:jmap:core',
  'urn:ietf:params:jmap:contacts',
];

export interface Contact {
  id: string;
  displayName: string;
  email: string;
  organization: string;
}

interface StalwartCard {
  id: string;
  card?: {
    displayName?: string;
    emails?: Array<{ value?: string }>;
    organizations?: Array<{ name?: string }>;
  };
}

export async function listContacts(
  cred: Credential,
): Promise<Contact[]> {
  const client = userClient(cred.user, cred.pass);

  // Address books in this account. The query is scoped to the user's
  // primary account; an account with none is not an error.
  let bookIds: string[] = [];
  try {
    const books = await client.one<{ ids: string[] }>(
      'AddressBook/query',
      { accountId: null },
      CONTACTS_USING,
    );
    bookIds = books.ids ?? [];
  } catch {
    bookIds = [];
  }
  if (!bookIds.length) return [];

  let cards: StalwartCard[] = [];
  try {
    const result = await client.one<{ list: StalwartCard[] }>(
      'ContactCard/get',
      { accountId: null, addressBookIds: bookIds, ids: null },
      CONTACTS_USING,
    );
    cards = result.list ?? [];
  } catch {
    cards = [];
  }

  const contacts: Contact[] = [];
  for (const card of cards) {
    const cardBody = card.card;
    if (!cardBody) continue;
    const email = cardBody.emails?.find((entry) => entry.value)?.value ?? '';
    if (!email) continue;
    contacts.push({
      id: card.id,
      displayName: cardBody.displayName ?? email,
      email,
      organization: cardBody.organizations?.[0]?.name ?? '',
    });
  }
  return contacts;
}
