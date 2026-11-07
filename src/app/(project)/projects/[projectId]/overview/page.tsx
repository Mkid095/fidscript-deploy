import { getInstantApp, getProject, getProjectMembers, getProjectResources } from '@/lib/api/project';
import { getDeployments } from '@/lib/api/resources';
import { PageHeader } from '@/components/ui/card';
import { Page } from '@/components/ui/page';
import { ErrorState } from '@/components/ui/feedback';
import { ProjectOverview } from '@/components/project/project-overview';

export const metadata = { title: 'Overview' };

/**
 * The project's overview.
 *
 * It is the screen the project opens on — so it has to carry the weight of
 * the whole console: what this is, what it has, and what to do next.
 */
export default async function ProjectOverviewPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;

  const project = await getProject(projectId).catch(() => null);
  if (!project) {
    return (
      <ErrorState
        title="That project could not be opened"
        message="It may have been deleted, or you may not reach it."
      />
    );
  }

  const [instant, deployments, members, resources] = await Promise.all([
    getInstantApp(project.id).catch(() => null),
    getDeployments(project.id).catch(() => []),
    getProjectMembers(project.id).catch(() => []),
    getProjectResources(project.id).catch(() => ({
      databases: 0,
      functions: 0,
      deployments: 0,
      domains: 0,
      emailDomains: 0,
    })),
  ]);

  // The owner is in the project whether or not they are on the members list.
  const memberCount = members.length + 1;

  const shape = project.shape ?? 'DEPLOYMENT';

  return (
    <Page>
      <PageHeader
        title={project.name}
        description={`${shapeLabel(shape)} · ${project.status.toLowerCase()}`}
      />
      <ProjectOverview
        projectSlug={project.slug}
        shape={shape}
        deploymentOn={project.deploymentOn ?? true}
        instant={instant}
        deployments={deployments}
        memberCount={memberCount}
        capabilities={{
          email: resources.emailDomains > 0,
          whatsapp: false,
          packages: true,
        }}
      />
    </Page>
  );
}

/** The shape, said the way a person would say it. */
function shapeLabel(shape: string): string {
  if (shape === 'BACKEND') return 'Backend as a service';
  if (shape === 'BOTH') return 'Backend and deployments';
  return 'Deployments';
}
