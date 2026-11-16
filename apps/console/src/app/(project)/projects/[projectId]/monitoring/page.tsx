import { redirect } from 'next/navigation';

import { serverApi as api } from '@/lib/api/server';
import { getProject } from '@/lib/api/project';
import { getAlertRules, getNotificationChannels } from '@/lib/api/monitoring';
import { AlertRulesPanel } from '@/components/project/alert-rules-panel';
import { NotificationChannelsPanel } from '@/components/project/notification-channels-panel';
import { applications } from '@/lib/api/platform';
import { AreaChart } from '@/components/system/system-charts';
import type { Series } from '@/lib/api/metrics';
import { Card, SectionHeader } from '@/components/ui/card';
import { Page } from '@/components/ui/page';
import { Badge, EmptyState } from '@/components/ui/feedback';
import { Button } from '@/components/ui/button';

export const metadata = { title: 'Monitoring' };

interface Alert {
  id: string;
  severity: string;
  status: string;
  message: string;
  createdAt: string;
}

/**
 * What is firing in this project.
 *
 * The alerts the platform raised, and the numbers it keeps. Both come from
 * the API — a project that emits nothing shows an empty list, not a zero
 * dressed up as a measurement.
 */
export default async function ProjectMonitoringPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;

  const project = await getProject(projectId).catch(() => null);
  if (!project) redirect('/projects');

  const observability = (await applications().catch(() => [])).find(
    (application) => application.id === 'observability',
  );
  const grafanaUrl = observability?.url ?? null;

  const hourAgo = new Date(Date.now() - 60 * 60_000).toISOString();

  const [alerts, stats, rules, channels, cpuSamples, memorySamples] =
    await Promise.all([
      api
        .get<{ alerts: Alert[] }>(`/projects/${project.id}/monitoring/alerts`)
        .catch(() => ({ alerts: [] as Alert[] })),
      api
        .get<{
          activeAlerts: number;
          totalMetrics: number;
          notificationChannels: number;
        }>(`/projects/${project.id}/monitoring/metrics/stats`)
        .catch(() => null),
      getAlertRules(project.id),
      getNotificationChannels(project.id),
      // The containers' own numbers, sampled by the platform every minute.
      api
        .get<{
          metrics: Array<{
            value: number;
            timestamp: string;
            labels: Record<string, string>;
          }>;
        }>(`/projects/${project.id}/monitoring/metrics?metric=container.cpu_percent&startTime=${hourAgo}`)
        .catch(() => ({ metrics: [] })),
      api
        .get<{
          metrics: Array<{
            value: number;
            timestamp: string;
            labels: Record<string, string>;
          }>;
        }>(`/projects/${project.id}/monitoring/metrics?metric=container.memory_bytes&startTime=${hourAgo}`)
        .catch(() => ({ metrics: [] })),
    ]);

  // One line per container: the sampler labels every point with it.
  const toSeries = (
    metrics: Array<{
      value: number;
      timestamp: string;
      labels: Record<string, string>;
    }>,
  ): Series[] => {
    const byContainer = new Map<string, Array<{ at: number; value: number }>>();
    for (const entry of metrics) {
      const name = entry.labels?.container ?? 'the deployment';
      const points = byContainer.get(name) ?? [];
      points.push({
        at: new Date(entry.timestamp).getTime(),
        value: entry.value,
      });
      byContainer.set(name, points);
    }
    return Array.from(byContainer.entries())
      .map(([name, points]) => ({
        name,
        points: points.sort((a, b) => a.at - b.at).slice(-60),
      }))
      .filter((series) => series.points.length >= 2);
  };

  const cpuSeries = toSeries(cpuSamples.metrics);
  const memorySeries = toSeries(memorySamples.metrics);

  return (
    <Page
      title="Monitoring"
      description="What the platform is watching in this project."
    >
      {stats ? (
        <section>
          <SectionHeader title="The numbers" />
          <Card className="divide-y divide-rail">
            <Row term="Alerts firing" value={stats.activeAlerts} />
            <Row term="Metrics" value={stats.totalMetrics} />
            <Row
              term="Notification channels"
              value={stats.notificationChannels}
            />
          </Card>
        </section>
      ) : null}

      <section>
        <SectionHeader
          title="The deployment, measured"
          description="CPU and memory of the running containers, sampled every minute."
        />
        <div className="space-y-4">
          <Card className="p-4">
            <p className="mb-3 text-xs font-medium text-text-muted">
              CPU, as a share of a core
            </p>
            <AreaChart
              series={cpuSeries}
              format={(value) => value.toFixed(1) + '%'}
              empty="Nothing sampled yet — the numbers appear about a minute after a deployment is healthy."
            />
          </Card>
          <Card className="p-4">
            <p className="mb-3 text-xs font-medium text-text-muted">Memory</p>
            <AreaChart
              series={memorySeries}
              format={(value) => (value / 1024 ** 2).toFixed(0) + ' MB'}
              empty="Nothing sampled yet — the numbers appear about a minute after a deployment is healthy."
            />
          </Card>
        </div>
      </section>

      <section>
        <SectionHeader
          title="The dashboards"
          description="Grafana has the whole picture — this is where the power users go."
        />
        <Card className="p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-text-muted">
              Metrics, logs and container stats, collected from everything this
              project runs.
            </p>
            {grafanaUrl ? (
              <a href={grafanaUrl} target="_blank" rel="noreferrer">
                <Button variant="outline" size="sm">
                  Open in Grafana
                </Button>
              </a>
            ) : null}
          </div>
        </Card>
      </section>

      <section>
        <SectionHeader
          title="The rules"
          description="When this project speaks up, and how loudly."
        />
        <AlertRulesPanel
          projectId={project.id}
          rules={rules}
          channels={channels}
        />
      </section>

      <section>
        <SectionHeader
          title="Where it goes"
          description="The places this project's alerts are sent to."
        />
        <NotificationChannelsPanel projectId={project.id} channels={channels} />
      </section>

      <section>
        <SectionHeader title="Alerts" />
        <Card>
          {alerts.alerts.length === 0 ? (
            <EmptyState
              title="Nothing is firing"
              body="An alert appears here when the platform sees something it was told to watch for."
            />
          ) : (
            <ul className="divide-y divide-rail">
              {alerts.alerts.map((alert) => (
                <li
                  key={alert.id}
                  className="flex flex-wrap items-center justify-between gap-3 px-4 py-3"
                >
                  <p className="min-w-0 flex-1 text-sm text-text">
                    {alert.message}
                  </p>
                  <div className="flex items-center gap-2">
                    <Badge
                      tone={
                        alert.severity === 'critical' ? 'danger' : 'warning'
                      }
                    >
                      {alert.severity}
                    </Badge>
                    <Badge tone="neutral">{alert.status}</Badge>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </section>
    </Page>
  );
}

function Row({ term, value }: { term: string; value: number }) {
  return (
    <div className="flex items-center justify-between gap-4 px-4 py-2.5">
      <span className="text-sm text-text-muted">{term}</span>
      <span className="text-sm text-text">{value}</span>
    </div>
  );
}
