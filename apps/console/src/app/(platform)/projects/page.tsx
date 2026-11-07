import { getProjectSummaries } from '@/lib/api/projects';
import { Card, PageHeader } from '@/components/ui/card';
import { Page } from '@/components/ui/page';
import { EmptyState } from '@/components/ui/feedback';
import { ProjectCard } from '@/components/project/project-card';
import { NewProjectDialog } from '@/components/platform/new-project-dialog';

/**
 * The projects.
 *
 * This page is for the projects that are there — what each one holds, and
 * whether it has been busy. Making a new one is a button away, in a panel
 * of its own.
 */
export const metadata = { title: 'Projects' };

export default async function ProjectsPage() {
  const projects = await getProjectSummaries();

  return (
    <Page width="wide">
      <PageHeader
        title="Projects"
        description="A project is a directory for one application — when you have a new one, make a project and name it after it."
        actions={<NewProjectDialog />}
      />

      {projects.length === 0 ? (
        <Card>
          <EmptyState
            title="No projects yet"
            body="A project holds one application: its code, its domains, its database and its settings. Make one, and it appears here."
          />
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {projects.map((summary) => (
            <ProjectCard key={summary.project.id} summary={summary} />
          ))}
        </div>
      )}
    </Page>
  );
}
