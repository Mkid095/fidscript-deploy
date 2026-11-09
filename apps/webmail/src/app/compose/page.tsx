import { redirect } from 'next/navigation';

import { currentSession, currentSessionToken, sessionCredential } from '@/lib/auth/session';
import { getMessage, listIdentities } from '@/lib/stalwart/mail';
import { Composer } from '@/components/compose/composer';

/**
 * Compose — plain, replying, or forwarding.
 *
 * The prefill for a reply or forward comes off the original message, read
 * as this user. The composer itself is the client component; this page
 * only prepares its starting state.
 */
export default async function ComposePage({
  searchParams,
}: {
  searchParams: Promise<{
    replyTo?: string;
    replyToAll?: string;
    forward?: string;
  }>;
}) {
  const { replyTo, replyToAll, forward } = await searchParams;
  const session = await currentSession();
  if (!session) redirect('/login');
  if (session.kind === 'admin') redirect('/admin');
  const token = await currentSessionToken();
  const cred = token ? sessionCredential(token) : null;
  if (!cred) redirect('/login');

  let prefill: {
    mode: 'new' | 'reply' | 'reply-all' | 'forward';
    to: string[];
    cc: string[];
    subject: string;
    quoted: string;
    originId: string | null;
  } = {
    mode: 'new',
    to: [],
    cc: [],
    subject: '',
    quoted: '',
    originId: null,
  };

  const originId = replyTo ?? replyToAll ?? forward;
  if (originId) {
    const original = await getMessage(cred, originId).catch(() => null);
    if (original) {
      const prefix = forward ? 'Fwd: ' : 'Re: ';
      const subject = original.subject.startsWith('Re: ')
        ? original.subject
        : `${prefix}${original.subject}`;
      const fromLine = original.from
        ? [original.from.name, original.from.email]
            .filter(Boolean)
            .join(' <')
            .concat('>')
            .trim()
        : '';
      const quote =
        original.html ?? original.text
          ? original.text ?? original.html ?? ''
          : '';
      prefill = {
        mode: forward ? 'forward' : replyToAll ? 'reply-all' : 'reply',
        to:
          forward
            ? []
            : original.from
              ? [original.from.email]
              : [],
        cc: replyToAll && !forward ? original.to.map((entry) => entry.email) : [],
        subject,
        quoted:
          forward && original.html
            ? original.html
            : forward
              ? original.text ?? ''
              : `${fromLine ? `On ${new Date(original.receivedAt).toLocaleString()}, ${fromLine} wrote:\n` : ''}${quote}`,
        originId,
      };
    }
  }

  let identities: Awaited<ReturnType<typeof listIdentities>> = [];
  try {
    identities = await listIdentities(cred);
  } catch {
    identities = [];
  }

  return <Composer prefill={prefill} identities={identities} />;
}
