import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/feedback';
import type { EmailStatus } from '@/lib/api/email';

/**
 * How the mail of this project stands.
 *
 * Each record is one thing that has to be true before a message leaves.
 * What the platform has not checked says "not checked" — it does not say
 * "fine".
 */
export function EmailStatusCard({ status }: { status: EmailStatus | null }) {
  if (!status) {
    return (
      <Card className="p-4">
        <p className="text-sm text-text-muted">
          The platform did not answer with the state of the mail.
        </p>
      </Card>
    );
  }

  return (
    <Card className="divide-y divide-rail">
      <Row
        term="MX"
        detail={status.mx.host ?? 'the mail exchanger'}
        state={status.mx.verified}
      />
      <Row term="SPF" detail="the sender policy" state={status.spf.verified} />
      <Row term="DKIM" detail="the signing key" state={status.dkim.verified} />
      <Row
        term="DMARC"
        detail="the reporting policy"
        state={status.dmarc.verified}
      />
      <Row
        term="Cloudflare"
        detail={
          status.cloudflare.connected
            ? 'connected — the records can be fixed for you'
            : 'not connected'
        }
        state={status.cloudflare.connected}
        neutral
      />
    </Card>
  );
}

function Row({
  term,
  detail,
  state,
  neutral = false,
}: {
  term: string;
  detail: string;
  state: boolean;
  neutral?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-4 px-4 py-2.5">
      <div className="min-w-0">
        <p className="text-sm text-text">{term}</p>
        <p className="truncate text-xs text-text-dim">{detail}</p>
      </div>
      <Badge tone={neutral ? 'neutral' : state ? 'success' : 'warning'}>
        {neutral
          ? state
            ? 'connected'
            : 'not connected'
          : state
            ? 'verified'
            : 'pending'}
      </Badge>
    </div>
  );
}
