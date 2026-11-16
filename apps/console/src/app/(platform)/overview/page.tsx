import Link from 'next/link';

import { applications, platformOverview } from '@/lib/api/platform';
import { Card, SectionHeader } from '@/components/ui/card';
import { Page, PageColumns } from '@/components/ui/page';
import { Badge, EmptyState, ErrorState } from '@/components/ui/feedback';
import { Button } from '@/components/ui/button';
import { sayEvent, sayWhen } from '@/lib/events';
import { getMachineState, getSystemState } from '@/lib/api/metrics';
import { Meter } from '@/components/system/system-charts';

/**
 * The platform's overview.
 *
 * What the person sees first, in the order they need it: their projects,
 * and beside them, what the platform is doing.
 *
 * Every number here is real. A number the platform cannot know reads
 * "Not available" — it never reads zero.
 */
export const metadata = { title: 'Overview' };

export default async function OverviewPage() {
  const [overview, apps, machine, system] = await Promise.all([
    platformOverview().catch(() => null),
    applications().catch(() => []),
    getMachineState(),
    getSystemState(),
  ]);

  const containers = system?.containers ?? [];
  const memoryUsed = containers.reduce(
    (total, entry) => total + entry.memoryBytes,
    0,
  );
  const cpuUsed = containers.reduce(
    (total, entry) => total + entry.cpuPercent,
    0,
  );

  const installed = apps.filter((app) => app.installed);
  const hasProjects = (overview?.projects.total ?? 0) > 0;

  return (
    <Page
      width="wide"
      title="Overview"
      description="Your projects, and what this platform is running."
      actions={
        <Link href="/projects">
          <Button variant="primary" size="sm">
            New project
          </Button>
        </Link>
      }
    >
      {!overview ? (
        <ErrorState
          title="The platform did not answer"
          message="The overview could not be loaded. The platform may be restarting — try again in a moment."
        />
      ) : (
        <PageColumns
          aside={
            <>
              {/* What the platform is running — one line, and a link. */}
              <section>
                <SectionHeader
                  title="This platform"
                  description="The applications it has."
                  actions={
                    <Link
                      href="/settings/applications"
                      className="text-xs text-text-muted transition-colors hover:text-text"
                    >
                      Manage
                    </Link>
                  }
                />
                <Card className="p-4">
                  {installed.length === 0 ? (
                    <p className="text-sm text-text-muted">
                      No applications are installed yet.
                    </p>
                  ) : (
                    <ul className="space-y-2">
                      {installed.map((app) => (
                        <li key={app.id} className="flex items-center gap-2">
                          <span className="size-1.5 shrink-0 rounded-full bg-success" />
                          <span className="truncate text-sm text-text">
                            {app.title}
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                </Card>
              </section>

              {/* The machine, at a glance. */}
              <section>
                <SectionHeader
                  title="This machine"
                  description="What the platform is running on."
                  actions={
                    <Link
                      href="/system"
                      className="text-xs text-text-muted transition-colors hover:text-text"
                    >
                      More
                    </Link>
                  }
                />
                <Card className="space-y-4 p-4">
                  <Meter
                    label="Memory"
                    used={memoryUsed}
                    total={machine.memoryTotal}
                    format={(value) => `${(value / 1024 ** 3).toFixed(1)} GB`}
                  />
                  <Meter
                    label="Disk"
                    used={system?.disk.used ?? 0}
                    total={system?.disk.total ?? 0}
                    format={(value) => `${(value / 1024 ** 3).toFixed(1)} GB`}
                  />
                  <p className="text-xs text-text-dim">
                    {cpuUsed.toFixed(0)}% of {machine.cpuCores.toFixed(0)} cores
                    · {containers.length} container
                    {containers.length === 1 ? '' : 's'}
                  </p>
                </Card>
              </section>

              {/* What needs attention. */}
              {overview.alerts.firing > 0 || overview.deployments.failed > 0 ? (
                <section>
                  <SectionHeader title="Needs attention" />
                  <Card className="divide-y divide-rail">
                    {overview.alerts.firing > 0 ? (
                      <div className="flex items-center justify-between gap-3 px-4 py-3">
                        <span className="text-sm text-text">
                          {overview.alerts.firing} alert
                          {overview.alerts.firing === 1 ? '' : 's'} firing
                        </span>
                        <Badge tone="warning">Across your projects</Badge>
                      </div>
                    ) : null}
                    {overview.deployments.failed > 0 ? (
                      <div className="flex items-center justify-between gap-3 px-4 py-3">
                        <span className="text-sm text-text">
                          {overview.deployments.failed} deployment
                          {overview.deployments.failed === 1 ? '' : 's'} failed
                        </span>
                        <Badge tone="danger">Needs a look</Badge>
                      </div>
                    ) : null}
                  </Card>
                </section>
              ) : null}

              {/* What has happened lately. */}
              <section>
                <SectionHeader
                  title="Lately"
                  description="What has happened here."
                />
                <Card>
                  {overview.activity.length === 0 ? (
                    <EmptyState
                      title="Nothing yet"
                      body="Every change in your projects shows up here."
                    />
                  ) : (
                    <ul className="divide-y divide-rail">
                      {overview.activity.slice(0, 6).map((entry) => (
                        <li key={entry.id} className="px-4 py-2.5">
                          <p className="text-sm text-text">
                            {sayEvent(entry.eventType)}
                          </p>
                          <p className="mt-0.5 truncate text-xs text-text-dim">
                            {entry.projectName ?? 'The platform'} ·{' '}
                            {sayWhen(entry.timestamp)}
                          </p>
                        </li>
                      ))}
                    </ul>
                  )}
                </Card>
              </section>
            </>
          }
        >
          {/* The next action. One thing, the highest-value one. */}
          {!hasProjects ? (
            <Card className="border-accent/40 bg-accent/5 p-6">
              <h2 className="text-sm font-semibold text-text">
                Create your first project
              </h2>
              <p className="mt-1 max-w-md text-sm leading-relaxed text-text-muted">
                A project holds the applications, the data and the domains for
                one thing you are building. You will be asked what it is for: a
                backend, something you deploy, or both.
              </p>
              <Link href="/projects" className="mt-4 inline-block">
                <Button variant="primary" size="sm">
                  Create a project
                </Button>
              </Link>
            </Card>
          ) : null}

          {/* The projects. */}
          <section>
            <SectionHeader
              title="Your projects"
              description="The workspaces you can reach."
              actions={
                <Link
                  href="/projects"
                  className="text-xs text-text-muted transition-colors hover:text-text"
                >
                  All projects
                </Link>
              }
            />
            {overview.projects.total === 0 ? (
              <Card>
                <EmptyState
                  title="No projects yet"
                  body="A project is a workspace: its members, its settings, and the capabilities switched on for it."
                />
              </Card>
            ) : (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {overview.projects.recent.slice(0, 4).map((project) => (
                  <Link
                    key={project.id}
                    href={`/projects/${project.slug}`}
                    className="group rounded-lg border border-rail bg-surface p-4 transition-colors hover:border-rail-light"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="truncate text-sm font-medium text-text group-hover:text-accent">
                        {project.name}
                      </span>
                      <StatusBadge status={project.status} />
                    </div>
                    <p className="mt-1 truncate font-mono text-xs text-text-dim">
                      {project.slug}
                    </p>
                  </Link>
                ))}
              </div>
            )}
          </section>

          {/* The deployments. */}
          <section>
            <SectionHeader
              title="Deployments"
              description="What has been shipped, and what failed."
            />
            <Card className="divide-y divide-rail">
              <div className="flex items-center justify-between gap-3 px-4 py-3">
                <span className="text-sm text-text">Running</span>
                <span className="text-sm text-text">
                  {overview.deployments.running}
                </span>
              </div>
              <div className="flex items-center justify-between gap-3 px-4 py-3">
                <span className="text-sm text-text">Failed</span>
                <span className="text-sm text-text">
                  {overview.deployments.failed}
                </span>
              </div>
              {overview.deployments.recent.length === 0 ? (
                <p className="px-4 py-3 text-xs text-text-dim">
                  Nothing has been deployed yet.
                </p>
              ) : (
                overview.deployments.recent.slice(0, 5).map((deployment) => (
                  <div
                    key={deployment.id}
                    className="flex items-center justify-between gap-3 px-4 py-3"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm text-text">
                        {deployment.projectName}
                      </p>
                      <p className="mt-0.5 truncate text-xs text-text-dim">
                        {sayWhen(deployment.createdAt)}
                      </p>
                    </div>
                    <Badge
                      tone={
                        deployment.status.toUpperCase() === 'SUCCESS'
                          ? 'success'
                          : deployment.status.toUpperCase() === 'FAILED'
                            ? 'danger'
                            : 'neutral'
                      }
                    >
                      {deployment.status.toLowerCase()}
                    </Badge>
                  </div>
                ))
              )}
            </Card>
          </section>
        </PageColumns>
      )}
    </Page>
  );
}

function StatusBadge({ status }: { status: string }) {
  const tone =
    status === 'ACTIVE'
      ? 'success'
      : status === 'SUSPENDED'
        ? 'warning'
        : status === 'CREATING'
          ? 'info'
          : 'neutral';
  return <Badge tone={tone}>{status.toLowerCase()}</Badge>;
}
