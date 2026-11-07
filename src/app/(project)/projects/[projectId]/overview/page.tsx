import { getInstantApp, getProject, getProjectMembers, getProjectResources } from '@/lib/api/project';
import { getDeployments } from '@/lib/api/resources';
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

  return (
    <ProjectOverview
      projectSlug={project.slug}
      name={project.name}
      shape={project.shape ?? 'DEPLOYMENT'}
      status={project.status}
      deploymentOn={project.deploymentOn ?? true}
      instant={instant}
      deployments={deployments}
      memberCount={memberCount}
      emailOn={resources.emailDomains > 0}
    />
  );
}
