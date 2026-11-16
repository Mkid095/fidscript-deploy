import { currentSession, currentSessionToken, sessionCredential } from '@/lib/auth/session';
import { listMailboxes, type Mailbox } from '@/lib/stalwart/mail';
import { MessageList } from '@/components/mail/message-list';

/**
 * Search all mail. The query arrives as ?q= from the top-bar box; the
 * searching itself is JMAP's, run as this user.
 */
export default async function SearchPage({
  params,
}: {
  params: Promise<{ q: string }>;
}) {
  const { q } = await params;
  const session = await currentSession();
  if (!session || session.kind !== 'mailbox') {
    return <p className="text-sm text-text-dim">Sign in to search.</p>;
  }
  const token = await currentSessionToken();
  const cred = token ? sessionCredential(token) : null;
  const mailboxes = cred ? await listMailboxes(cred).catch(() => [] as Mailbox[]) : [];

  return (
    <MessageList
      title={`Search: ${q}`}
      mailboxId="all"
      text={q}
      mailboxes={mailboxes}
    />
  );
}
