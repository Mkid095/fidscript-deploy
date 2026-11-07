'use client';

import { useState, useTransition } from 'react';

import { Button } from '@/components/ui/button';
import { Input, Select } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Badge, EmptyState, ErrorState } from '@/components/ui/feedback';
import type { AlertRule, NotificationChannel } from '@/lib/api/monitoring';

import {
  createAlertRuleAction,
  deleteAlertRuleAction,
} from '@/app/(project)/projects/[projectId]/monitoring/actions';

/**
 * The rules that say when to speak up.
 *
 * A rule is a number and a line: *when this metric goes above that, say
 * so*. It is the project's own rule — not a platform-wide one.
 */
export function AlertRulesPanel({
  projectId,
  rules,
  channels,
}: {
  projectId: string;
  rules: AlertRule[];
  channels: NotificationChannel[];
}) {
  const [name, setName] = useState('');
  const [metric, setMetric] = useState('cpu_percent');
  const [condition, setCondition] = useState<'above' | 'below' | 'equals'>('above');
  const [threshold, setThreshold] = useState('80');
  const [severity, setSeverity] = useState<'critical' | 'warning' | 'info'>('warning');
  const [channel, setChannel] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const create = () => {
    setError(null);
    startTransition(async () => {
      const result = await createAlertRuleAction(projectId, {
        name: name.trim(),
        metric: metric.trim(),
        condition,
        threshold: Number(threshold),
        severity,
        channels: channel ? [channel] : [],
      });
      if (result.error) setError(result.error);
      else {
        setName('');
        setThreshold('80');
      }
    });
  };

  const remove = (ruleId: string) => {
    setError(null);
    startTransition(async () => {
      const result = await deleteAlertRuleAction(projectId, ruleId);
      if (result.error) setError(result.error);
    });
  };

  return (
    <div className="space-y-3">
      <Card>
        {rules.length === 0 ? (
          <EmptyState
            title="No rules yet"
            body="A rule is a number and a line: when this metric goes above that, say so."
          />
        ) : (
          <ul className="divide-y divide-rail">
            {rules.map((rule) => (
              <li key={rule.id} className="flex items-center justify-between gap-4 px-4 py-3">
                <div className="min-w-0">
                  <p className="truncate text-sm text-text">{rule.name}</p>
                  <p className="truncate text-xs text-text-dim">
                    {rule.metric} {rule.condition} {rule.threshold}
                    {rule.durationSeconds ? ` for ${rule.durationSeconds}s` : ''}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge
                    tone={
                      rule.severity === 'critical'
                        ? 'danger'
                        : rule.severity === 'warning'
                          ? 'warning'
                          : 'info'
                    }
                  >
                    {rule.severity}
                  </Badge>
                  <Button variant="ghost" size="sm" onClick={() => remove(rule.id)} loading={pending}>
                    Remove
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card>
        <div className="max-w-2xl space-y-4 p-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <Input
              label="Name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="The CPU is too high"
            />
            <Input
              label="Metric"
              value={metric}
              onChange={(event) => setMetric(event.target.value)}
              hint="cpu_percent · memory_bytes · request_rate · error_rate"
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <Select
              label="When"
              value={condition}
              onChange={(event) =>
                setCondition(event.target.value as 'above' | 'below' | 'equals')
              }
              options={[
                { value: 'above', label: 'Goes above' },
                { value: 'below', label: 'Goes below' },
                { value: 'equals', label: 'Equals' },
              ]}
            />
            <Input
              label="Threshold"
              type="number"
              value={threshold}
              onChange={(event) => setThreshold(event.target.value)}
            />
            <Select
              label="How loudly"
              value={severity}
              onChange={(event) =>
                setSeverity(event.target.value as 'critical' | 'warning' | 'info')
              }
              options={[
                { value: 'critical', label: 'Critical' },
                { value: 'warning', label: 'Warning' },
                { value: 'info', label: 'Information' },
              ]}
            />
          </div>

          <Select
            label="Where it goes"
            value={channel}
            onChange={(event) => setChannel(event.target.value)}
            options={[
              { value: '', label: 'Nowhere yet' },
              ...channels.map((entry) => ({ value: entry.id, label: entry.name })),
            ]}
          />

          {error ? <ErrorState message={error} /> : null}

          <Button
            variant="primary"
            size="sm"
            onClick={create}
            loading={pending}
            disabled={!name.trim() || !metric.trim()}
          >
            Make the rule
          </Button>
        </div>
      </Card>
    </div>
  );
}
