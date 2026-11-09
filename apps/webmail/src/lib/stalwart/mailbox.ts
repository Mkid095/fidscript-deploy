/**
 * The mailbox's own view of itself, read as that user over JMAP.
 *
 * These calls are made with the mailbox's own credential (server-side, from
 * the visit's session), so Stalwart authoritatively scopes everything: a
 * user only sees their own account.
 */
import { resolveAccountId, userClient } from '@/lib/stalwart/jmap';

export interface MailboxRow {
  id: string;
  name: string;
  role: string | null;
  totalEmails: number;
  unreadEmails: number;
}

export interface IdentityRow {
  id: string;
  name: string;
  email: string;
  isDefault: boolean;
  signatureHtml?: string;
}

interface StalwartMailbox {
  id: string;
  name: string;
  role: string | null;
  totalEmails: number;
  unreadEmails: number;
}

interface StalwartIdentity {
  id: string;
  name: string;
  email: string;
  isDefault?: boolean;
  htmlSignature?: string;
  textSignature?: string;
}

/** The mailboxes of this account, with their real counts. */
export async function listMailboxesOfUser(
  user: string,
  pass: string,
): Promise<MailboxRow[]> {
  const client = userClient(user, pass);
  const accountId = await resolveAccountId(client, user, pass);
  const result = await client.one<{ list: StalwartMailbox[] }>(
    'Mailbox/get',
    {
      accountId,
      ids: null,
      properties: ['id', 'name', 'role', 'totalEmails', 'unreadEmails'],
    },
  );
  return result.list ?? [];
}

/** The sending identities and signatures. */
export async function listIdentitiesOfUser(
  user: string,
  pass: string,
): Promise<IdentityRow[]> {
  const client = userClient(user, pass);
  const accountId = await resolveAccountId(client, user, pass);
  const result = await client.one<{ list: StalwartIdentity[] }>(
    'Identity/get',
    { accountId, ids: null },
  );
  const rows = result.list ?? [];
  return rows.map((row, index) => ({
    id: row.id,
    name: row.name,
    email: row.email,
    isDefault: rows.length === 1 || Boolean(row.isDefault),
    signatureHtml: row.htmlSignature ?? '',
  }));
}
