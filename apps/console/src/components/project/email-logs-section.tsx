import { Card } from '@/components/ui/card';
import { Badge, EmptyState } from '@/components/ui/feedback';
import type { EmailMessage } from '@/lib/api/email';
import { sayWhen } from '@/lib/events';

/**
 * The messages.
 *
 * What left, what arrived, and what happened to it.
 */
export function EmailLogsSection({ messages }: { messages: EmailMessage[] }) {
  if (messages.length === 0) {
    return (
      <Card>
        <EmptyState
          title="No messages yet"
          body="Every message the project sends or receives is listed here."
        />
      </Card>
    );
  }

  return (
    <Card>
      <ul className="divide-y divide-rail">
        {messages.slice(0, 20).map((message) => (
          <li key={message.id} className="px-4 py-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate text-sm text-text">
                  {message.subject || '(no subject)'}
                </p>
                <p className="mt-0.5 truncate text-xs text-text-dim">
                  {message.from} → {message.to} · {sayWhen(message.createdAt)}
                </p>
              </div>
              <Badge
                tone={
                  message.status === 'DELIVERED'
                    ? 'success'
                    : message.status === 'BOUNCED'
                      ? 'danger'
                      : 'neutral'
                }
              >
                {message.status.toLowerCase()}
              </Badge>
            </div>
          </li>
        ))}
      </ul>
    </Card>
  );
}
