'use client';

import Link from 'next/link';
import type { ReactNode } from 'react';
import { HugeiconsIcon } from '@hugeicons/react';
import { Folder01Icon, Rocket01Icon, Alert02Icon, Activity01Icon } from '@hugeicons/core-free-icons';

/**
 * The pieces of the overview.
 *
 * A panel is a title, a number and the thing the number is about. There is
 * no invented data here: a panel with nothing behind it says so rather than
 * showing a zero that looks like a measurement.
 */
export function OverviewPanel({
  title,
  icon,
  count,
  hint,
  children,
  tone = 'neutral',
}: {
  title: string;
  icon: typeof Folder01Icon;
  count?: number;
  hint?: string;
  children?: ReactNode;
  tone?: 'neutral' | 'warning' | 'danger';
}) {
  const toneClass =
    tone === 'danger'
      ? 'text-[var(--danger)]'
      : tone === 'warning'
        ? 'text-[var(--warning)]'
        : 'text-[var(--text)]';

  return (
    <section className="rounded-xl border border-[var(--rail)] bg-[var(--surface)] p-5">
      <div className="flex items-center gap-2 mb-3">
        <HugeiconsIcon icon={icon} size={16} className="text-[var(--text-dim)]" />
        <h2 className="text-sm font-semibold text-[var(--text)]">{title}</h2>
        {count !== undefined && (
          <span className={`text-sm font-semibold ml-auto ${toneClass}`}>{count}</span>
        )}
      </div>
      {hint && <p className="text-xs text-[var(--text-dim)] mb-3">{hint}</p>}
      {children}
    </section>
  );
}

/** The projects the operator can reach. */
export function OverviewProjects({
  projects,
}: {
  projects: Array<{ id: string; name: string; slug: string; type: string; status: string }>;
}) {
  if (projects.length === 0) {
    return (
      <p className="text-xs text-[var(--text-muted)]">
        No projects yet. A project is where a deployment, a database or a function lives.
      </p>
    );
  }
  return (
    <ul className="space-y-1.5">
      {projects.map((project) => (
        <li key={project.id}>
          <Link
            href={`/projects/${project.slug}`}
            className="flex items-center gap-2 text-xs text-[var(--text)] hover:text-[var(--accent)]"
          >
            <span className="truncate">{project.name}</span>
            <span className="text-[var(--text-dim)] uppercase text-[10px] ml-auto flex-shrink-0">
              {project.status?.toLowerCase()}
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}

/** The deployments, and the ones that failed. */
export function OverviewDeployments({
  recent,
  failures,
}: {
  recent: Array<{ id: string; projectSlug: string; projectName: string; status: string; deploymentUrl: string | null }>;
  failures: Array<{ id: string; projectSlug: string; projectName: string; status: string }>;
}) {
  return (
    <div className="space-y-3">
      {failures.length > 0 && (
        <div>
          <p className="text-xs font-medium text-[var(--danger)] mb-1.5">Failed</p>
          <ul className="space-y-1">
            {failures.map((deployment) => (
              <li key={deployment.id}>
                <Link
                  href={`/projects/${deployment.projectSlug}/deployments/${deployment.id}`}
                  className="text-xs text-[var(--danger)] hover:underline"
                >
                  {deployment.projectName} — {deployment.status.toLowerCase()}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
      {recent.length === 0 ? (
        <p className="text-xs text-[var(--text-muted)]">Nothing has been deployed yet.</p>
      ) : (
        <ul className="space-y-1">
          {recent.map((deployment) => (
            <li key={deployment.id}>
              <Link
                href={`/projects/${deployment.projectSlug}/deployments/${deployment.id}`}
                className="text-xs text-[var(--text-muted)] hover:text-[var(--text)]"
              >
                {deployment.projectName} — {deployment.status.toLowerCase()}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/** The alerts that are firing. */
export function OverviewAlerts({
  alerts,
}: {
  alerts: Array<{ id: string; projectSlug: string; severity: string; message: string }>;
}) {
  if (alerts.length === 0) {
    return <p className="text-xs text-[var(--text-muted)]">Nothing is firing.</p>;
  }
  return (
    <ul className="space-y-1.5">
      {alerts.map((alert) => (
        <li key={alert.id} className="text-xs">
          <span className="text-[var(--text-dim)] uppercase text-[10px] mr-1.5">
            {alert.severity}
          </span>
          <span className="text-[var(--text)]">{alert.message}</span>
        </li>
      ))}
    </ul>
  );
}

/** The recent activity. */
export function OverviewActivity({
  events,
}: {
  events: Array<{ id: string; eventType: string; projectName: string | null; timestamp: string }>;
}) {
  if (events.length === 0) {
    return <p className="text-xs text-[var(--text-muted)]">Nothing has happened yet.</p>;
  }
  return (
    <ul className="space-y-1.5">
      {events.map((event) => (
        <li key={event.id} className="text-xs text-[var(--text-muted)] flex gap-2">
          <span className="text-[var(--text-dim)] flex-shrink-0">
            {new Date(event.timestamp).toLocaleDateString()}
          </span>
          <span className="truncate">
            {event.projectName ? `${event.projectName} — ` : ''}
            {event.eventType}
          </span>
        </li>
      ))}
    </ul>
  );
}

/** The icons the panels use, in one place. */
export const OVERVIEW_ICONS = {
  projects: Folder01Icon,
  deployments: Rocket01Icon,
  alerts: Alert02Icon,
  activity: Activity01Icon,
};
