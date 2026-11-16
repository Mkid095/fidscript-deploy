import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/feedback';
import type { EmailAnalytics, EmailMessage } from '@/lib/api/email';

/**
 * The activity — what has happened to the mail.
 *
 * The counts are the platform's own (what was sent, delivered, opened,
 * bounced) and the log is the messages themselves. Nothing here is
 * estimated: a number the platform has not measured reads as zero and is
 * said to be zero.
 */
export function EmailActivityCard({
  analytics,
  messages,
}: {
  analytics: EmailAnalytics | null;
  messages: EmailMessage[];
}) {
  const total = analytics?.total ?? 0;

  const stats: Array<{ label: string; value: number }> =
    total > 0
      ? [
          { label: 'Sent', value: analytics!.byStatus.sent },
          { label: 'Delivered', value: analytics!.byStatus.delivered },
          { label: 'Opened', value: analytics!.byStatus.opened },
          { label: 'Bounced', value: analytics!.byStatus.bounced },
        ]
      : [];

  return (
    <div className="space-y-4">
      {total > 0 ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {stats.map((stat) => (
            <Card key={stat.label} className="p-4">
              <p className="text-xs text-text-dim">{stat.label}</p>
              <p className="mt-1 text-2xl font-semibold text-text">
                {stat.value}
              </p>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <EmptyState
            title="Nothing has been sent yet"
            body="The counts fill in as the project sends mail — what was delivered, what was opened, and what bounced."
          />
        </Card>
      )}

      <Card>
        <div className="flex items-center justify-between gap-3 border-b border-rail px-4 py-3">
          <p className="text-sm font-medium text-text">Messages</p>
          <span className="text-xs text-text-dim">{messages.length}</span>
        </div>
        {messages.length === 0 ? (
          <EmptyState
            title="No messages yet"
            body="Messages show up here as they are sent and received."
          />
        ) : (
          <ul className="divide-y divide-rail">
            {messages.map((message) => (
              <li
                key={message.id}
                className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 px-4 py-3"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm text-text">
                    {message.subject || '(no subject)'}
                  </p>
                  <p className="truncate font-mono text-xs text-text-dim">
                    {message.from} → {message.to}
                  </p>
                </div>
                <span className="shrink-0 text-xs text-text-dim">
                  {new Date(message.createdAt).toLocaleString()} ·{' '}
                  {message.status}
                </span>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
