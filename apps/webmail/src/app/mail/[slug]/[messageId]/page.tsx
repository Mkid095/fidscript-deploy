import Link from 'next/link';
import { notFound } from 'next/navigation';

import { currentSession, currentSessionToken, sessionCredential } from '@/lib/auth/session';
import { getMessage, setFlags } from '@/lib/stalwart/mail';
import { Badge, EmptyState } from '@/components/ui';

/**
 * One message, as its owner sees it. Opening it marks it read — the way
 * an inbox works; that write is the server's, so the counts stay honest.
 *
 * The HTML body is rendered in a script-less sandbox: a message's HTML
 * must never reach this application's cookies or session.
 */
export default async function MessagePage({
  params,
}: {
  params: Promise<{ slug: string; messageId: string }>;
}) {
  const { slug, messageId } = await params;
  const session = await currentSession();
  if (!session || session.kind !== 'mailbox') notFound();
  const token = await currentSessionToken();
  const cred = token ? sessionCredential(token) : null;
  if (!cred) notFound();

  let message: Awaited<ReturnType<typeof getMessage>>;
  try {
    message = await getMessage(cred, messageId);
    if (!message) notFound();
  } catch {
    notFound();
  }

  if (!message.seen) {
    await setFlags(cred, [message.id], { seen: true }).catch(() => {
      // The mark failed; the page still renders — the count catches up
      // on the next read.
    });
  }

  const backHref = `/mail/${slug}`;

  return (
    <section className="rounded-lg border border-rail bg-surface">
      <header className="border-b border-rail p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h1 className="truncate text-base font-semibold text-text">
              {message.subject || '(no subject)'}
            </h1>
            <p className="mt-1 text-xs text-text-muted">
              From <strong>{message.from?.name || message.from?.email}</strong>
              {message.from?.name ? (
                <span className="text-text-dim"> &lt;{message.from.email}&gt;</span>
              ) : null}
            </p>
            <p className="text-xs text-text-dim">
              To {(message.to ?? [])
                .map((entry) => entry.name || entry.email)
                .join(', ') || '—'}
            </p>
            <p className="text-xs text-text-dim">
              {new Date(message.receivedAt).toLocaleString()}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {message.flagged ? <Badge tone="warning">starred</Badge> : null}
            {message.junk ? <Badge tone="danger">spam</Badge> : null}
          </div>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          <Link
            href={`/compose?replyTo=${message.id}`}
            className="rounded border border-rail px-2.5 py-1 text-xs text-text-muted hover:bg-surface-2"
          >
            Reply
          </Link>
          <Link
            href={`/compose?replyToAll=${message.id}`}
            className="rounded border border-rail px-2.5 py-1 text-xs text-text-muted hover:bg-surface-2"
          >
            Reply all
          </Link>
          <Link
            href={`/compose?forward=${message.id}`}
            className="rounded border border-rail px-2.5 py-1 text-xs text-text-muted hover:bg-surface-2"
          >
            Forward
          </Link>
          <a
            href={backHref}
            className="rounded border border-rail px-2.5 py-1 text-xs text-text-muted hover:bg-surface-2"
          >
            Back
          </a>
          <button
            type="button"
            onClick={() => window.print()}
            className="rounded border border-rail px-2.5 py-1 text-xs text-text-muted hover:bg-surface-2"
          >
            Print
          </button>
        </div>
      </header>

      <div className="p-4">
        {message.html ? (
          // A sandbox with no allow-scripts: the mail's HTML cannot run,
          // and cannot see this application's cookies or endpoints.
          <iframe
            title="Message"
            sandbox=""
            srcDoc={message.html}
            style={{ width: '100%', border: 0, minHeight: 240 }}
          />
        ) : message.text ? (
          <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed text-text">
            {message.text}
          </pre>
        ) : (
          <EmptyState title="This message has no readable body" />
        )}

        {message.parts.filter((part) => part.isAttachment).length > 0 ? (
          <div className="mt-4 border-t border-rail pt-4">
            <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-text-dim">
              Attachments
            </h2>
            <ul className="space-y-1.5">
              {message.parts
                .filter((part) => part.isAttachment)
                .map((part) => (
                  <li key={part.partId}>
                    <a
                      href={`/api/mail/${message.id}/parts/${part.partId}`}
                      className="inline-flex items-center gap-2 rounded border border-rail px-3 py-1.5 text-sm text-accent hover:bg-surface-2"
                    >
                      <span>📎</span>
                      {part.name ?? 'attachment'}
                      {part.size !== null ? (
                        <span className="text-xs text-text-dim">
                          · {formatBytes(part.size)}
                        </span>
                      ) : null}
                    </a>
                  </li>
                ))}
            </ul>
          </div>
        ) : null}
      </div>
    </section>
  );
}

function formatBytes(size: number): string {
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / 1024 / 1024).toFixed(1)} MB`;
}
