'use client';

import { useRouter } from 'next/navigation';
import { Card, EmptyState } from '@fidscript/ui';
import type { AlertRule, Alert } from '@/types';

const SEVERITY_COLORS: Record<string, string> = {
  warning: 'bg-[var(--warning)]/10 text-[var(--warning)]',
  critical: 'bg-[var(--danger)]/10 text-[var(--danger)]',
  info: 'bg-[var(--accent)]/10 text-[var(--accent)]',
};

interface Props {
  rules: AlertRule[];
  alerts: Record<string, Alert>;
  selectedProjectId: string | null;
  onCreateClick: () => void;
}

export function AlertList({ rules, alerts, selectedProjectId, onCreateClick }: Props) {
  const router = useRouter();

  if (rules.length === 0) {
    return (
      <Card className="border border-[var(--rail)]">
        <EmptyState
          title="No alert rules"
          description="Create an alert rule to get notified when metrics cross thresholds."
          action={
            <button onClick={onCreateClick} className="px-4 py-2 bg-[var(--accent)] text-white rounded text-sm hover:opacity-90">
              Create Alert
            </button>
          }
        />
      </Card>
    );
  }

  return (
    <Card className="border border-[var(--rail)] overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-[var(--rail)]">
            <th className="text-left text-xs text-[var(--text-muted)] font-medium px-4 py-3">Name</th>
            <th className="text-left text-xs text-[var(--text-muted)] font-medium px-4 py-3">Metric</th>
            <th className="text-left text-xs text-[var(--text-muted)] font-medium px-4 py-3">Condition</th>
            <th className="text-left text-xs text-[var(--text-muted)] font-medium px-4 py-3">Severity</th>
            <th className="text-left text-xs text-[var(--text-muted)] font-medium px-4 py-3">Status</th>
            <th className="text-left text-xs text-[var(--text-muted)] font-medium px-4 py-3">Actions</th>
          </tr>
        </thead>
        <tbody>
          {rules.map(rule => (
            <tr
              key={rule.id}
              className="border-b border-[var(--rail)] last:border-0 hover:bg-[var(--rail)]/30 cursor-pointer"
              onClick={() => router.push(`/monitoring/${rule.id}?project=${selectedProjectId}`)}
            >
              <td className="px-4 py-3">
                <span className="font-medium text-[var(--text)]">{rule.name}</span>
              </td>
              <td className="px-4 py-3">
                <span className="font-mono text-xs text-[var(--text-muted)] bg-[var(--surface-2)] px-2 py-0.5 rounded">
                  {rule.metric}
                </span>
              </td>
              <td className="px-4 py-3 text-[var(--text-muted)] text-xs">
                {rule.condition} {rule.threshold}
              </td>
              <td className="px-4 py-3">
                <span className={`text-xs px-2 py-0.5 rounded ${SEVERITY_COLORS[rule.severity] ?? 'bg-[var(--rail)] text-[var(--text-muted)]'}`}>
                  {rule.severity}
                </span>
              </td>
              <td className="px-4 py-3">
                {(() => {
                  const isFiring = alerts[rule.id]?.status === 'firing';
                  if (isFiring) return <span className="text-xs px-2 py-0.5 rounded bg-[var(--danger)]/10 text-[var(--danger)]">FIRING</span>;
                  if (!rule.enabled) return <span className="text-xs px-2 py-0.5 rounded bg-[var(--rail)] text-[var(--text-muted)]">PAUSED</span>;
                  return <span className="text-xs px-2 py-0.5 rounded bg-[var(--success)]/10 text-[var(--success)]">ACTIVE</span>;
                })()}
              </td>
              <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                <button
                  onClick={() => router.push(`/monitoring/${rule.id}?project=${selectedProjectId}`)}
                  className="text-xs text-[var(--text-muted)] hover:text-[var(--text)] bg-none border-none cursor-pointer p-0"
                >
                  View
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </Card>
  );
}
