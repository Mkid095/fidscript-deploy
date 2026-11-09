import { notFound } from 'next/navigation';

import { currentSession, currentSessionToken, sessionCredential } from '@/lib/auth/session';
import { listMailboxes, type Mailbox } from '@/lib/stalwart/mail';
import { MessageList } from '@/components/mail/message-list';

/**
 * A folder view. The slug is a standard folder name (inbox, sent, drafts,
 * spam, trash, archive, starred), or the name of a custom folder, or the
 * mailbox id prefixed with "id-".
 */
export default async function MailboxPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const session = await currentSession();
  if (!session || session.kind !== 'mailbox') notFound();
  const token = await currentSessionToken();
  const cred = token ? sessionCredential(token) : null;
  if (!cred) notFound();

  const mailboxes = await listMailboxes(cred).catch(() => [] as Mailbox[]);

  // Resolve the slug to a mailbox.
  let mode: 'mailbox' | 'starred' | 'all' = 'mailbox';
  let mailboxId: string | null = null;
  let mailboxName = slug;

  // This Stalwart build reports the inbox's role as "inbox", not the
  // RFC-standard "all" — accept whichever it answers with.
  const roleSlug: Record<string, string> = {
    inbox: 'inbox',
    sent: 'sent',
    drafts: 'drafts',
    spam: 'junk',
    junk: 'junk',
    trash: 'trash',
    archive: 'archive',
  };

  let missing = false;
  if (slug === 'starred') {
    mode = 'starred';
  } else if (slug === 'all') {
    mode = 'all';
  } else if (roleSlug[slug]) {
    const role = roleSlug[slug];
    const match =
      mailboxes.find((m) => m.role === role) ??
      (role === 'inbox' ? mailboxes.find((m) => m.role === 'all') : undefined);
    if (match) {
      mailboxId = match.id;
      mailboxName = match.name;
    } else {
      missing = true;
    }
  } else if (slug.startsWith('id-')) {
    const id = slug.slice(3);
    const match = mailboxes.find((m) => m.id === id);
    if (match) {
      mailboxId = match.id;
      mailboxName = match.name;
    } else {
      missing = true;
    }
  } else {
    // A custom folder by slugified name.
    const match = mailboxes.find(
      (m) =>
        m.name
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-|-$/g, '') === slug,
    );
    if (match) {
      mailboxId = match.id;
      mailboxName = match.name;
    } else {
      missing = true;
    }
  }

  const queryMailbox =
    mode === 'mailbox' && mailboxId ? mailboxId : mode === 'all' ? 'all' : null;

  if (missing) {
    return (
      <div className="rounded-lg border border-dashed border-rail px-4 py-10 text-center">
        <p className="text-sm font-medium text-text">No such folder</p>
        <p className="mt-1 text-xs text-text-dim">
          This account has no folder called "{slug}". Stalwart opens the
          standard set on first use, or create a new one.
        </p>
      </div>
    );
  }

  return (
    <MessageList
      title={mailboxName}
      mailboxId={queryMailbox}
      starred={mode === 'starred'}
      mailboxes={mailboxes}
    />
  );
}
