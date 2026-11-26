import { Card, SectionHeader } from '@/components/ui/card';
import { Page } from '@/components/ui/page';
import { Badge, EmptyState } from '@/components/ui/feedback';
import {
  getMachineCpu,
  getMachineState,
  getSiteTraffic,
  getSystemLogs,
  getSystemState,
  getDeletionTasks,
  getSpace,
} from '@/lib/api/metrics';
import { getPlatformDomain, getPlatformBackupStatus } from '@/lib/api/platform';
import { AreaChart, BarList, Meter } from '@/components/system/system-charts';
import { DeletionTasksCard } from '@/components/system/deletion-tasks-card';
import { BackupsCard } from '@/components/system/backups-card';
import { SpaceCard } from '@/components/system/space-card';

export const metadata = { title: 'System' };

/**
 * The machine.
 *
 * What is running, what each of it is using, and what it has said. The
 * numbers come from the Docker daemon and from the platform's collector —
 * not from anything the console remembers.
 */
export default async function SystemPage() {
  const [state, machine, cpu, logs, traffic, domain, deletionTasks, backup, space] =
    await Promise.all([
      getSystemState(),
      getMachineState(),
      getMachineCpu(),
      getSystemLogs(),
      getSiteTraffic(),
      getPlatformDomain(),
      getDeletionTasks(),
      // The backup card is admin-only; a non-admin session gets nothing,
      // not an error.
      getPlatformBackupStatus().catch(() => null),
      // The disk/space card reads the daemon's own report; it is null (and
      // hidden) for a session that may not see it.
      getSpace().catch(() => null),
    ]);

  const grafanaUrl = domain ? `https://grafana.${domain}` : null;
  const containers = state?.containers ?? [];

  const memoryUsed = containers.reduce(
    (total, entry) => total + entry.memoryBytes,
    0,
  );
  const cpuUsed = containers.reduce(
    (total, entry) => total + entry.cpuPercent,
    0,
  );

  return (
    <Page
      width="wide"
      title="System"
      description="What this machine is running, and what each of it is using."
      actions={
        grafanaUrl ? (
          <a href={grafanaUrl} target="_blank" rel="noreferrer">
            <Badge tone="accent">Open in Grafana</Badge>
          </a>
        ) : null
      }
    >
      <section>
        <SectionHeader title="The machine" />
        <Card className="grid grid-cols-1 gap-6 p-4 sm:grid-cols-3">
          <Meter
            label="Memory"
            used={memoryUsed}
            total={machine.memoryTotal}
            format={(value) => `${(value / 1024 ** 3).toFixed(1)} GB`}
          />
          <Meter
            label="Disk"
            used={state?.disk.used ?? 0}
            total={state?.disk.total ?? 0}
            format={(value) => `${(value / 1024 ** 3).toFixed(1)} GB`}
          />
          <div>
            <div className="flex items-baseline justify-between gap-3">
              <span className="text-sm text-text-muted">CPU</span>
              <span className="text-sm text-text">
                {cpuUsed.toFixed(0)}% of {machine.cpuCores.toFixed(0)} cores
              </span>
            </div>
            <p className="mt-1 text-[11px] text-text-dim">
              {containers.length} container{containers.length === 1 ? '' : 's'}{' '}
              running
            </p>
          </div>
        </Card>
      </section>

      <SpaceCard report={space} />

      <section>
        <SectionHeader
          title="The CPU over the last hour"
          description="What the machine itself has been using."
        />
        <Card className="p-4">
          <AreaChart
            series={cpu}
            format={(value) => `${value.toFixed(2)} cores`}
          />
        </Card>
      </section>

      {/* Memory and CPU sit beside each other — the two questions about a
          machine are "how full" and "how busy", and they answer together. */}
      <div className="grid grid-cols-1 gap-8 xl:grid-cols-2">
        <section>
          <SectionHeader
            title="What is using the most"
            description="The memory each container is holding."
          />
          <Card className="p-4">
            <BarList
              samples={containers.map((entry) => ({
                name: entry.name,
                value: entry.memoryBytes,
              }))}
              format={(value) => `${(value / 1024 ** 2).toFixed(0)} MB`}
            />
          </Card>
        </section>

        <section>
          <SectionHeader
            title="The CPU"
            description="What each container is using, as a share of a core."
          />
          <Card className="p-4">
            <BarList
              samples={containers.map((entry) => ({
                name: entry.name,
                value: entry.cpuPercent,
              }))}
              format={(value) => `${value.toFixed(1)}%`}
            />
          </Card>
        </section>
      </div>

      <section>
        <SectionHeader
          title="The network"
          description="What each container has carried, in and out."
        />
        <Card className="p-4">
          <BarList
            samples={containers.map((entry) => ({
              name: entry.name,
              value: entry.networkBytes,
            }))}
            format={(value) => `${(value / 1024 ** 2).toFixed(1)} MB`}
          />
        </Card>
      </section>

      <section>
        <SectionHeader
          title="What is running"
          description="Every container, and the image it runs."
        />
        <Card>
          {containers.length === 0 ? (
            <EmptyState
              title="Nothing is running"
              body="The platform reads the containers itself."
            />
          ) : (
            <ul className="divide-y divide-rail">
              {containers.map((entry) => (
                <li key={entry.name} className="px-4 py-3">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate font-mono text-xs text-text">
                        {entry.name}
                      </p>
                      <p className="truncate text-xs text-text-dim">
                        {entry.image}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-text-dim">
                        {entry.cpuPercent.toFixed(1)}% cpu
                      </span>
                      <span className="text-xs text-text-dim">
                        {(entry.memoryBytes / 1024 ** 2).toFixed(0)} MB
                      </span>
                      <Badge tone="success">{entry.status.split(' ')[0]}</Badge>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </section>

      <section>
        <SectionHeader
          title="The traffic"
          description="The requests each of the platform's own sites carried in the last hour."
        />
        <Card className="p-4">
          <BarList
            samples={traffic.map((entry) => ({
              name: entry.site,
              value: entry.requests,
            }))}
            format={(value) => `${value.toFixed(0)} requests`}
          />
          {traffic.some((entry) => entry.errors > 0) ? (
            <p className="mt-3 text-xs text-text-dim">
              {traffic.reduce((total, entry) => total + entry.errors, 0)} of
              them did not succeed.
            </p>
          ) : null}
        </Card>
      </section>

      <section>
        <SectionHeader
          title="The logs"
          description="What the platform has said in the last half hour."
        />
        <Card>
          {logs.length === 0 ? (
            <EmptyState
              title="Nothing logged"
              body="The platform's logs are collected here as they are written."
            />
          ) : (
            <ul className="max-h-96 divide-y divide-rail overflow-y-auto">
              {logs.slice(0, 80).map((entry, index) => (
                <li key={`${entry.at}-${index}`} className="px-4 py-2">
                  <p className="font-mono text-xs leading-relaxed text-text-muted">
                    <span className="text-text-dim">{entry.source}</span>{' '}
                    {entry.line}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </section>

      <DeletionTasksCard tasks={deletionTasks} />

      <BackupsCard status={backup} />
    </Page>
  );
}
