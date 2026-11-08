import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/feedback';
import type { EmailAnalytics } from '@/lib/api/email';

/**
 * How the mail has been going.
 *
 * The numbers are the platform's own count of what it sent and what
 * happened to it.
 */
export function EmailDeliverabilitySection({
  analytics,
}: {
  analytics: EmailAnalytics | null;
}) {
  if (!analytics || analytics.total === 0) {
    return (
      <Card>
        <EmptyState
          title="Nothing has been sent yet"
          body="The counts fill in as the project sends mail — what was delivered, what was opened, and what bounced."
        />
      </Card>
    );
  }

  const rows: Array<[string, number]> = [
    ['Delivered', analytics.byStatus.delivered],
    ['Opened', analytics.byStatus.opened],
    ['Clicked', analytics.byStatus.clicked],
    ['Bounced', analytics.byStatus.bounced],
    ['Queued', analytics.byStatus.queued],
    ['Sent', analytics.byStatus.sent],
  ];

  const delivered = analytics.byStatus.delivered;
  const bounced = analytics.byStatus.bounced;
  const rate =
    delivered + bounced > 0
      ? Math.round((delivered / (delivered + bounced)) * 100)
      : null;

  return (
    <Card className="divide-y divide-rail">
      {rate !== null ? (
        <div className="flex items-center justify-between gap-4 px-4 py-3">
          <span className="text-sm text-text">Reached the inbox</span>
          <span className="text-sm font-medium text-text">{rate}%</span>
        </div>
      ) : null}
      {rows.map(([label, value]) => (
        <div
          key={label}
          className="flex items-center justify-between gap-4 px-4 py-2.5"
        >
          <span className="text-sm text-text-muted">{label}</span>
          <span className="text-sm text-text">{value}</span>
        </div>
      ))}
      <div className="px-4 py-2.5">
        <p className="text-xs text-text-dim">
          Over the last {analytics.rangeDays} days.
        </p>
      </div>
    </Card>
  );
}
