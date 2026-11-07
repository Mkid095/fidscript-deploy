import Link from 'next/link';

import { applications, platformOverview } from '@/lib/api/platform';
import { Card, PageHeader, SectionHeader } from '@/components/ui/card';
import { Badge, EmptyState, ErrorState } from '@/components/ui/feedback';
import { Button } from '@/components/ui/button';

/**
 * The platform's overview.
 *
 * What the person sees first, in the order they need it: their projects, the
 * platform's health, and the one thing to do next.
 *
 * Every number here is real. A number the platform cannot know reads
 * "Not available" — it never reads zero.
 */
export const metadata = { title: 'Overview' };

export default async function OverviewPage() {
  const [overview, apps] = await Promise.all([
    platformOverview().catch(() => null),
    applications().catch(() => []),
  ]);

  const installed = apps.filter((app) => app.installed);
  const hasProjects = (overview?.projects.total ?? 0) > 0;

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <PageHeader
        title="Overview"
        description="Your projects, and what this platform is running."
        actions={
          <Link href="/projects">
            <Button variant="primary" size="sm">
              New project
            </Button>
          </Link>
        }
      />

      {!overview ? (
        <ErrorState
          title="The platform did not answer"
          message="The overview could not be loaded. The platform may be restarting — try again in a moment."
        />
      ) : (
        <>
          {/* The next action. One thing, the highest-value one. */}
          {!hasProjects ? (
            <Card className="border-accent/40 bg-accent/5 p-6">
              <h2 className="text-sm font-semibold text-text">
                Create your first project
              </h2>
              <p className="mt-1 max-w-md text-sm text-text-muted">
                A project holds the applications, the data and the domains for one thing you are
                building. You will be asked what it is for: a backend, something you deploy, or
                both.
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
                <Link href="/projects" className="text-xs text-text-muted hover:text-text">
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
                    className="rounded-lg border border-rail bg-surface p-4 transition-colors hover:border-rail-light"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="truncate text-sm font-medium text-text">{project.name}</span>
                      <StatusBadge status={project.status} />
                    </div>
                    <p className="mt-1 text-xs text-text-dim">{project.slug}</p>
                  </Link>
                ))}
              </div>
            )}
          </section>

          {/* What the platform is running — one line, and a link. */}
          <section>
            <SectionHeader
              title="This platform"
              description="The applications it has."
              actions={
                <Link href="/settings/applications" className="text-xs text-text-muted hover:text-text">
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
                <div className="flex flex-wrap gap-2">
                  {installed.map((app) => (
                    <Badge key={app.id} tone="neutral">
                      {app.title}
                    </Badge>
                  ))}
                </div>
              )}
            </Card>
          </section>

          {/* What needs attention. */}
          {overview.alerts.firing > 0 || overview.deployments.failed > 0 ? (
            <section>
              <SectionHeader title="Needs attention" />
              <Card className="divide-y divide-rail">
                {overview.alerts.firing > 0 ? (
                  <div className="flex items-center justify-between px-4 py-3">
                    <span className="text-sm text-text">
                      {overview.alerts.firing} alert{overview.alerts.firing === 1 ? '' : 's'} firing
                    </span>
                    <Badge tone="warning">Across your projects</Badge>
                  </div>
                ) : null}
                {overview.deployments.failed > 0 ? (
                  <div className="flex items-center justify-between px-4 py-3">
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
        </>
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const tone =
    status === 'ACTIVE' ? 'success' : status === 'SUSPENDED' ? 'warning' : status === 'CREATING' ? 'info' : 'neutral';
  return <Badge tone={tone}>{status.toLowerCase()}</Badge>;
}
