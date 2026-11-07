import { redirect } from 'next/navigation';

import { serverApi as api } from '@/lib/api/server';
import { getProject } from '@/lib/api/project';
import { Card, PageHeader, SectionHeader } from '@/components/ui/card';
import { Badge, EmptyState } from '@/components/ui/feedback';

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

  const [alerts, stats] = await Promise.all([
    api
      .get<{ alerts: Alert[] }>(`/projects/${project.id}/monitoring/alerts`)
      .catch(() => ({ alerts: [] as Alert[] })),
    api
      .get<{ activeAlerts: number; totalMetrics: number; notificationChannels: number }>(
        `/projects/${project.id}/monitoring/metrics/stats`,
      )
      .catch(() => null),
  ]);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageHeader title="Monitoring" description="What the platform is watching in this project." />

      {stats ? (
        <section>
          <SectionHeader title="The numbers" />
          <Card className="divide-y divide-rail">
            <Row term="Alerts firing" value={stats.activeAlerts} />
            <Row term="Metrics" value={stats.totalMetrics} />
            <Row term="Notification channels" value={stats.notificationChannels} />
          </Card>
        </section>
      ) : null}

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
                <li key={alert.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
                  <p className="min-w-0 flex-1 text-sm text-text">{alert.message}</p>
                  <div className="flex items-center gap-2">
                    <Badge tone={alert.severity === 'critical' ? 'danger' : 'warning'}>
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
    </div>
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
