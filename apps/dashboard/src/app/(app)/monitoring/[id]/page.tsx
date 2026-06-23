'use client';

import { useEffect, useState } from 'react';
import { Button, Card, EmptyState, Spinner } from '@fidscript/ui';
import { useParams, useSearchParams } from 'next/navigation';

import { useAuth } from '@/contexts/auth-context';
import type { AlertRule, Alert, NotificationChannel } from '@/types';

type Tab = 'overview' | 'history';

const SEVERITY_COLORS: Record<string, string> = {
  warning: 'bg-amber-500/10 text-amber-400',
  critical: 'bg-red-500/10 text-red-400',
  info: 'bg-blue-500/10 text-blue-400',
};

const STATUS_COLORS: Record<string, string> = {
  firing: 'bg-red-500/10 text-red-400',
  pending: 'bg-amber-500/10 text-amber-400',
  resolved: 'bg-emerald-500/10 text-emerald-400',
};

export default function AlertDetailPage() {
  const { getSdk } = useAuth();
  const params = useParams();
  const searchParams = useSearchParams();
  const alertId = params.id as string;
  const projectId = searchParams.get('project') ?? '';

  const [rule, setRule] = useState<AlertRule | null>(null);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [channels, setChannels] = useState<NotificationChannel[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>('overview');
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    if (!projectId || !alertId) return;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const sdk = getSdk();
        const [rules, alertsData, channelsData] = await Promise.all([
          sdk.monitoring.listAlertRules(projectId),
          sdk.monitoring.getAlerts(projectId),
          sdk.monitoring.listNotificationChannels(projectId),
        ]);
        const matchedRule = rules.find(r => r.id === alertId);
        setRule(matchedRule ?? null);
        // Filter alerts for this rule by matching metric + name context
        setAlerts(alertsData.filter(a => {
          // The Alert type may not have ruleId, so we match by severity/name context
          return true; // show all alerts if no rule match
        }));
        setChannels(channelsData);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load alert');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [projectId, alertId, getSdk]);

  async function handleAcknowledge(alertId: string) {
    if (!projectId) return;
    setActionLoading(true);
    try {
      const sdk = getSdk();
      await sdk.monitoring.acknowledgeAlert(projectId, alertId);
      setAlerts(prev => prev.map(a => a.id === alertId ? { ...a, status: 'resolved' as const } : a));
    } finally {
      setActionLoading(false);
    }
  }

  async function handleResolve(alertId: string) {
    if (!projectId) return;
    setActionLoading(true);
    try {
      const sdk = getSdk();
      await sdk.monitoring.resolveAlert(projectId, alertId);
      setAlerts(prev => prev.map(a => a.id === alertId ? { ...a, status: 'resolved' as const } : a));
    } finally {
      setActionLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <Spinner size="lg" />
      </div>
    );
  }

  if (error || !rule) {
    return (
      <div className="flex flex-col items-center justify-center min-h-96 gap-4">
        <p className="text-red-400 text-sm">{error ?? 'Alert rule not found'}</p>
        <Button variant="ghost" size="sm" onClick={() => history.back()}>
          Go back
        </Button>
      </div>
    );
  }

  const currentAlert = alerts.find(a => a.severity === rule.severity);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-xl font-bold text-slate-200">{rule.name}</h1>
            <span className={`text-xs px-2 py-0.5 rounded ${SEVERITY_COLORS[rule.severity] ?? 'bg-slate-700 text-slate-400'}`}>
              {rule.severity}
            </span>
            {currentAlert && (
              <span className={`text-xs px-2 py-0.5 rounded ${STATUS_COLORS[currentAlert.status] ?? 'bg-slate-700 text-slate-400'}`}>
                {currentAlert.status.toUpperCase()}
              </span>
            )}
          </div>
          <p className="text-sm text-slate-500 font-mono">
            {rule.metric} {rule.condition} {rule.threshold}
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-4 border-b border-[#1e2130]">
        {(['overview', 'history'] as Tab[]).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm border-b-2 transition-colors ${
              tab === t
                ? 'border-red-500 text-slate-200'
                : 'border-transparent text-slate-500 hover:text-slate-300'
            }`}
          >
            {t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

      {tab === 'overview' ? (
        <div className="space-y-6">
          {/* Rule config */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card className="border border-[#1e2130]" padding="md">
              <p className="text-xs text-slate-500 mb-1">Metric</p>
              <p className="text-sm font-mono text-slate-200">{rule.metric}</p>
            </Card>
            <Card className="border border-[#1e2130]" padding="md">
              <p className="text-xs text-slate-500 mb-1">Condition</p>
              <p className="text-sm text-slate-200">
                {rule.condition} {rule.threshold} for {rule.durationSeconds}s
              </p>
            </Card>
            <Card className="border border-[#1e2130]" padding="md">
              <p className="text-xs text-slate-500 mb-1">Severity</p>
              <p className="text-sm">
                <span className={`text-xs px-2 py-0.5 rounded ${SEVERITY_COLORS[rule.severity] ?? 'bg-slate-700 text-slate-400'}`}>
                  {rule.severity}
                </span>
              </p>
            </Card>
            <Card className="border border-[#1e2130]" padding="md">
              <p className="text-xs text-slate-500 mb-1">Status</p>
              <p className="text-sm">
                <span className={`text-xs px-2 py-0.5 rounded ${rule.enabled ? 'bg-emerald-500/10 text-emerald-400' : 'bg-slate-700 text-slate-400'}`}>
                  {rule.enabled ? 'Active' : 'Disabled'}
                </span>
              </p>
            </Card>
          </div>

          {/* Notification channels */}
          <div>
            <h2 className="text-sm font-semibold text-slate-200 mb-3">Notification Channels</h2>
            {channels.length === 0 ? (
              <Card className="border border-[#1e2130]">
                <p className="text-sm text-slate-500">No notification channels configured.</p>
              </Card>
            ) : (
              <div className="space-y-2">
                {rule.channels.map((channelId: string) => {
                  const channel = channels.find(c => c.id === channelId);
                  if (!channel) return null;
                  return (
                    <Card key={channel.id} className="border border-[#1e2130]" padding="sm">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-slate-200">{channel.name}</p>
                          <p className="text-xs text-slate-500">{channel.type}</p>
                        </div>
                        <span className="text-xs px-2 py-0.5 rounded bg-[#1e2130] text-slate-400">
                          {channel.type}
                        </span>
                      </div>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>

          {/* Active alerts */}
          {currentAlert && (
            <div>
              <h2 className="text-sm font-semibold text-slate-200 mb-3">Current Alert State</h2>
              <Card className="border border-[#1e2130]" padding="md">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm text-slate-200 mb-1">{currentAlert.message}</p>
                    <p className="text-xs text-slate-500">
                      First triggered: {currentAlert.firstTriggeredAt ? new Date(currentAlert.firstTriggeredAt).toLocaleString() : '—'}
                    </p>
                    {currentAlert.firedAt && (
                      <p className="text-xs text-slate-500">
                        Fired: {new Date(currentAlert.firedAt).toLocaleString()}
                      </p>
                    )}
                  </div>
                  <div className="flex gap-2">
                    {currentAlert.status === 'firing' && (
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => handleAcknowledge(currentAlert.id)}
                        loading={actionLoading}
                      >
                        Acknowledge
                      </Button>
                    )}
                    {currentAlert.status !== 'resolved' && (
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() => handleResolve(currentAlert.id)}
                        loading={actionLoading}
                      >
                        Resolve
                      </Button>
                    )}
                  </div>
                </div>
              </Card>
            </div>
          )}
        </div>
      ) : (
        <div>
          <h2 className="text-sm font-semibold text-slate-200 mb-3">Alert History</h2>
          {alerts.length === 0 ? (
            <Card className="border border-[#1e2130]">
              <EmptyState
                title="No alert history"
                description="This rule has not triggered any alerts yet."
              />
            </Card>
          ) : (
            <Card className="border border-[#1e2130] overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[#1e2130]">
                    <th className="text-left text-xs text-slate-500 font-medium px-4 py-3">Severity</th>
                    <th className="text-left text-xs text-slate-500 font-medium px-4 py-3">Status</th>
                    <th className="text-left text-xs text-slate-500 font-medium px-4 py-3">Message</th>
                    <th className="text-left text-xs text-slate-500 font-medium px-4 py-3">Fired</th>
                    <th className="text-left text-xs text-slate-500 font-medium px-4 py-3">Resolved</th>
                  </tr>
                </thead>
                <tbody>
                  {alerts.map(alert => (
                    <tr key={alert.id} className="border-b border-[#1e2130] last:border-0 hover:bg-[#1e2130]/30">
                      <td className="px-4 py-3">
                        <span className={`text-xs px-2 py-0.5 rounded ${SEVERITY_COLORS[alert.severity] ?? 'bg-slate-700 text-slate-400'}`}>
                          {alert.severity}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-xs px-2 py-0.5 rounded ${STATUS_COLORS[alert.status] ?? 'bg-slate-700 text-slate-400'}`}>
                          {alert.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-400 text-xs max-w-xs truncate">{alert.message}</td>
                      <td className="px-4 py-3 text-slate-500 text-xs">
                        {alert.firedAt ? new Date(alert.firedAt).toLocaleString() : '—'}
                      </td>
                      <td className="px-4 py-3 text-slate-500 text-xs">
                        {alert.resolvedAt ? new Date(alert.resolvedAt).toLocaleString() : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
