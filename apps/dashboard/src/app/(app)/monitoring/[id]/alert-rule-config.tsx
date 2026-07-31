'use client';

import { Card } from '@fidscript/ui';
import type { AlertRule } from '@/types';

const SEVERITY_COLORS: Record<string, string> = {
  warning: 'bg-[var(--warning)]/10 text-[var(--warning)]',
  critical: 'bg-[var(--danger)]/10 text-[var(--danger)]',
  info: 'bg-[var(--accent)]/10 text-[var(--accent)]',
};

interface AlertRuleConfigProps {
  rule: AlertRule;
}

export function AlertRuleConfig({ rule }: AlertRuleConfigProps) {
  const intervalLabel = (s: number) => s >= 60 ? `${s / 60}m` : `${s}s`;

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
      <Card className="border border-[var(--rail)]" padding="md">
        <p className="text-xs text-[var(--text-muted)] mb-1">Metric</p>
        <p className="text-sm font-mono text-[var(--text)]">{rule.metric}</p>
      </Card>
      <Card className="border border-[var(--rail)]" padding="md">
        <p className="text-xs text-[var(--text-muted)] mb-1">Condition</p>
        <p className="text-sm text-[var(--text)]">{rule.condition} {rule.threshold}</p>
      </Card>
      <Card className="border border-[var(--rail)]" padding="md">
        <p className="text-xs text-[var(--text-muted)] mb-1">Interval</p>
        <p className="text-sm text-[var(--text)]">{intervalLabel(rule.durationSeconds)}</p>
      </Card>
      <Card className="border border-[var(--rail)]" padding="md">
        <p className="text-xs text-[var(--text-muted)] mb-1">Severity</p>
        <span className={`text-xs px-2 py-0.5 rounded ${SEVERITY_COLORS[rule.severity] ?? 'bg-[var(--rail)] text-[var(--text-muted)]'}`}>
          {rule.severity}
        </span>
      </Card>
    </div>
  );
}
