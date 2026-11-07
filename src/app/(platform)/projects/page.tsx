import Link from 'next/link';

import { listProjects } from '@/lib/api/projects';
import { Card, PageHeader, SectionHeader } from '@/components/ui/card';
import { Badge, EmptyState, ErrorState } from '@/components/ui/feedback';
import { NewProjectForm } from '@/components/platform/new-project-form';

/**
 * The projects.
 *
 * A prominent **New project**, and the shape question inside the create
 * form — because the shape is what the project's menu is derived from, and
 * asking it later would mean changing the menu later.
 */
export const metadata = { title: 'Projects' };

export default async function ProjectsPage() {
  const projects = await listProjects().catch(() => null);

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <PageHeader
        title="Projects"
        description="The workspaces you can reach."
      />

      {!projects ? (
        <ErrorState
          title="The platform did not answer"
          message="The projects could not be loaded. The platform may be restarting — try again in a moment."
        />
      ) : (
        <>
          <section>
            <SectionHeader title="New project" description="What the project is for." />
            <Card className="p-5">
              <NewProjectForm />
            </Card>
          </section>

          <section>
            <SectionHeader title="Your projects" />
            {projects.length === 0 ? (
              <Card>
                <EmptyState
                  title="No projects yet"
                  body="The one above is the first."
                />
              </Card>
            ) : (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {projects.map((project) => (
                  <Link
                    key={project.id}
                    href={`/projects/${project.slug}`}
                    className="rounded-lg border border-rail bg-surface p-4 transition-colors hover:border-rail-light"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="truncate text-sm font-medium text-text">{project.name}</span>
                      <Badge tone={project.status === 'ACTIVE' ? 'success' : 'neutral'}>
                        {project.status.toLowerCase()}
                      </Badge>
                    </div>
                    <p className="mt-1 truncate font-mono text-xs text-text-dim">{project.slug}</p>
                    {project.shape ? (
                      <p className="mt-2 text-[11px] uppercase tracking-wide text-text-dim">
                        {shapeLabel(project.shape)}
                      </p>
                    ) : null}
                  </Link>
                ))}
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}

/** The shape, said the way a person would say it. */
function shapeLabel(shape: string): string {
  if (shape === 'BACKEND') return 'Backend';
  if (shape === 'BOTH') return 'Backend + Deployments';
  return 'Deployments';
}
