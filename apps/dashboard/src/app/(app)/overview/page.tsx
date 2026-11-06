'use client';

import Link from 'next/link';
import { HugeiconsIcon } from '@hugeicons/react';
import { Add01Icon, Rocket01Icon, Layers01Icon } from '@hugeicons/core-free-icons';

import { usePlatformOverview } from '@/components/overview/use-platform-overview';
import {
  OverviewPanel,
  OverviewProjects,
  OverviewDeployments,
  OverviewAlerts,
  OverviewActivity,
  OVERVIEW_ICONS,
} from '@/components/overview/overview-panel';

/**
 * The platform overview — where an operator lands.
 *
 * It answers the questions an operator actually has: how many projects can
 * I reach, what is running, what failed, what is firing, and what happened
 * lately. Every number comes from the platform's own overview endpoint,
 * which counts over **the caller's own projects** — so it is a picture of
 * their work and not of the platform, and never of somebody else's.
 *
 * When there is nothing to show, it says so.
 */
export default function OverviewPage() {
  const { overview, loading, error, reload } = usePlatformOverview();

  if (loading) {
    return (
      <div className="max-w-5xl">
        <h1 className="text-xl font-bold text-[var(--text)] mb-1">Overview</h1>
        <p className="text-sm text-[var(--text-muted)]" aria-live="polite">
          Reading your projects…
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-5xl">
        <h1 className="text-xl font-bold text-[var(--text)] mb-4">Overview</h1>
        <p className="text-sm text-[var(--danger)] mb-3" role="alert">
          {error}
        </p>
        <button
          onClick={reload}
          className="text-sm text-[var(--accent)] hover:underline"
        >
          Try again
        </button>
      </div>
    );
  }

  if (!overview) return null;

  const { projects, deployments, alerts, activity } = overview;
  const nothingAtAll =
    projects.total === 0 && deployments.total === 0 && alerts.firing === 0 && activity.length === 0;

  return (
    <div className="max-w-5xl space-y-5">
      <header className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-[var(--text)] mb-1">Overview</h1>
          <p className="text-sm text-[var(--text-muted)]">
            {projects.total === 0
              ? 'What is happening across your projects.'
              : `What is happening across your ${projects.total} project${projects.total === 1 ? '' : 's'}.`}
          </p>
        </div>
        <Link
          href="/deployments/new"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[var(--accent)] text-[var(--text)] text-xs font-medium hover:opacity-90 flex-shrink-0"
        >
          <HugeiconsIcon icon={Add01Icon} size={13} />
          New deployment
        </Link>
      </header>

      {nothingAtAll && (
        <div className="rounded-xl border border-[var(--rail)] bg-[var(--surface)] p-6 text-center">
          <HugeiconsIcon icon={Rocket01Icon} size={22} className="text-[var(--text-dim)] mx-auto mb-3" />
          <p className="text-sm font-medium text-[var(--text)] mb-1">Nothing here yet</p>
          <p className="text-xs text-[var(--text-muted)] mb-4">
            Create a project, then deploy something into it — this page will show what is running,
            what failed and what needs your attention.
          </p>
          <Link
            href="/projects"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[var(--rail)] text-xs font-medium hover:bg-[var(--rail)]"
          >
            <HugeiconsIcon icon={Layers01Icon} size={13} />
            Go to projects
          </Link>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <OverviewPanel
          title="Projects"
          icon={OVERVIEW_ICONS.projects}
          count={projects.total}
          hint="The projects you can reach."
        >
          <OverviewProjects projects={projects.recent} />
        </OverviewPanel>

        <OverviewPanel
          title="Deployments"
          icon={OVERVIEW_ICONS.deployments}
          count={deployments.total}
          tone={deployments.failed > 0 ? 'danger' : 'neutral'}
          hint={
            deployments.running > 0
              ? `${deployments.running} running right now.`
              : 'Nothing is running right now.'
          }
        >
          <OverviewDeployments
            recent={deployments.recent.filter(
              (d) => !deployments.failures.some((f) => f.id === d.id),
            )}
            failures={deployments.failures}
          />
        </OverviewPanel>

        <OverviewPanel
          title="Alerts"
          icon={OVERVIEW_ICONS.alerts}
          count={alerts.firing}
          tone={alerts.firing > 0 ? 'warning' : 'neutral'}
          hint="What needs your attention."
        >
          <OverviewAlerts alerts={alerts.recent.filter((a: { status: string }) => a.status !== 'resolved')} />
        </OverviewPanel>

        <OverviewPanel
          title="Recent activity"
          icon={OVERVIEW_ICONS.activity}
          hint="The last things that happened."
        >
          <OverviewActivity events={activity} />
        </OverviewPanel>
      </div>
    </div>
  );
}
