import Link from 'next/link';

import { Badge } from '@/components/ui/feedback';
import { Sparkline } from '@/components/project/sparkline';
import { sayWhen } from '@/lib/events';
import type { ProjectSummary } from '@/lib/api/projects';

/**
 * One project.
 *
 * What it is, what it holds, and whether it has been busy — the little
 * graph is the project's own activity over the last day, read from the
 * machine that ran it.
 */
export function ProjectCard({ summary }: { summary: ProjectSummary }) {
  const { project } = summary;

  return (
    <Link
      href={`/projects/${project.slug}`}
      className="group flex flex-col rounded-lg border border-rail bg-surface p-4 transition-colors hover:border-rail-light"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-text group-hover:text-accent">
            {project.name}
          </p>
          <p className="mt-0.5 truncate font-mono text-xs text-text-dim">
            {project.slug}
          </p>
        </div>
        <Badge
          tone={
            project.status === 'ACTIVE'
              ? 'success'
              : project.status === 'CREATING'
                ? 'info'
                : project.status === 'SUSPENDED'
                  ? 'warning'
                  : 'neutral'
          }
        >
          {project.status.toLowerCase()}
        </Badge>
      </div>

      {project.description ? (
        <p className="mt-2 line-clamp-2 text-xs leading-relaxed text-text-muted">
          {project.description}
        </p>
      ) : null}

      <p className="mt-2 text-xs text-text-dim">{shapeLabel(project.shape)}</p>

      <dl className="mt-3 grid grid-cols-3 gap-2 border-t border-rail pt-3">
        <Count term="Deployments" value={summary.deployments} />
        <Count term="Domains" value={summary.domains} />
        <Count term="Databases" value={summary.databases} />
      </dl>

      <div className="mt-3 flex items-end justify-between gap-3 border-t border-rail pt-3">
        <p className="text-[11px] text-text-dim">
          {summary.lastDeployAt
            ? `last deployed ${sayWhen(summary.lastDeployAt)}`
            : summary.activity.some((value) => value > 0)
              ? 'Activity over the last day'
              : 'Nothing has run yet'}
        </p>
        <Sparkline values={summary.activity} />
      </div>
    </Link>
  );
}

function Count({ term, value }: { term: string; value: number }) {
  return (
    <div>
      <dt className="text-[10px] uppercase tracking-wide text-text-dim">
        {term}
      </dt>
      <dd className="text-sm text-text">{value}</dd>
    </div>
  );
}

function shapeLabel(shape?: string): string {
  if (shape === 'BACKEND') return 'Backend as a service';
  if (shape === 'BOTH') return 'Backend and deployments';
  return 'Deployments';
}
