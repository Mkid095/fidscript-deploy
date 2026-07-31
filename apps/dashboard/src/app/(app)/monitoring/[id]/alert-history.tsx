'use client';

import { Card, EmptyState } from '@fidscript/ui';
import type { AlertRule } from '@/types';

interface AlertEvaluation {
  id: string;
  ruleId: string;
  timestamp: string;
  value: number;
  fired: boolean;
  message?: string;
}

interface AlertHistoryProps {
  evaluations: AlertEvaluation[];
}

export function AlertHistory({ evaluations }: AlertHistoryProps) {
  if (evaluations.length === 0) {
    return (
      <Card className="border border-[var(--rail)]">
        <EmptyState
          title="No evaluations yet"
          description="Evaluations will appear here once the rule starts running."
        />
      </Card>
    );
  }

  return (
    <Card className="border border-[var(--rail)] overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-[var(--rail)]">
            <th className="text-left text-xs text-[var(--text-muted)] font-medium px-4 py-3">Timestamp</th>
            <th className="text-left text-xs text-[var(--text-muted)] font-medium px-4 py-3">Value</th>
            <th className="text-left text-xs text-[var(--text-muted)] font-medium px-4 py-3">Status</th>
          </tr>
        </thead>
        <tbody>
          {evaluations.map(ev => (
            <tr key={ev.id} className="border-b border-[var(--rail)] last:border-0 hover:bg-[var(--rail)]/30">
              <td className="px-4 py-3 text-[var(--text-muted)] text-xs">
                {new Date(ev.timestamp).toLocaleString()}
              </td>
              <td className="px-4 py-3 text-[var(--text-muted)] font-mono text-xs">
                {ev.value.toFixed(4)}
              </td>
              <td className="px-4 py-3">
                <span className={`text-xs px-2 py-0.5 rounded ${
                  ev.fired
                    ? 'bg-[var(--danger)]/10 text-[var(--danger)]'
                    : 'bg-[var(--success)]/10 text-[var(--success)]'
                }`}>
                  {ev.fired ? 'FIRE' : 'OK'}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </Card>
  );
}
