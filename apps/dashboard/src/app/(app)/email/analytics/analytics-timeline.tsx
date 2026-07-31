'use client';

import { Card } from '@fidscript/ui';

interface TimelineItem { date: string; sent: number; bounced: number; failed: number; }

interface Props { timeline: TimelineItem[]; }

export function AnalyticsTimeline({ timeline }: Props) {
  if (timeline.length === 0) return null;

  const maxVal = Math.max(...timeline.map(t => Math.max(t.sent, t.bounced, t.failed)), 1);

  return (
    <Card className="border border-[var(--rail)] p-5 mb-6">
      <h2 className="text-sm font-semibold text-[var(--text)] mb-4">Daily Send Volume</h2>
      <div className="flex items-end gap-1 h-40">
        {timeline.map(t => (
          <div key={t.date} className="flex-1 flex flex-col justify-end gap-0.5"
            title={`${t.date}: ${t.sent} sent, ${t.bounced} bounced, ${t.failed} failed`}>
            {t.failed > 0 && <div className="bg-red-500 rounded-t" style={{ height: `${(t.failed / maxVal) * 100}%` }} />}
            {t.bounced > 0 && <div className="bg-orange-500" style={{ height: `${(t.bounced / maxVal) * 100}%` }} />}
            {t.sent > 0 && <div className="bg-emerald-500" style={{ height: `${(t.sent / maxVal) * 100}%` }} />}
          </div>
        ))}
      </div>
      <div className="flex gap-4 mt-3 text-xs text-[var(--text-muted)]">
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-500" /> Sent</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-orange-500" /> Bounced</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-500" /> Failed</span>
      </div>
    </Card>
  );
}
