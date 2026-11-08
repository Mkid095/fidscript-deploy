import {
  getInstantApp,
  getProject,
  getProjectBuckets,
  getProjectMembers,
  getProjectResources,
} from '@/lib/api/project';
import {
  getDatabases,
  getDeployments,
  getDomains,
  getFunctions,
  getProjectEvents,
} from '@/lib/api/resources';
import { Page } from '@/components/ui/page';
import { ErrorState } from '@/components/ui/feedback';
import { ProjectOverview } from '@/components/project/project-overview';

export const metadata = { title: 'Overview' };

/**
 * The project's overview.
 *
 * The project's dashboard: what it is, what is up, what is not, and what
 * to do next. Every section is fed from the API — the services tiles are
 * their real states, not guesses.
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

  const [
    instant,
    deployments,
    members,
    resources,
    buckets,
    domains,
    databases,
    functions,
    events,
  ] = await Promise.all([
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
    getProjectBuckets(project.id),
    getDomains(project.id).catch(() => []),
    getDatabases(project.id).catch(() => []),
    getFunctions(project.id).catch(() => []),
    getProjectEvents(project.id).catch(() => []),
  ]);

  // The owner is in the project whether or not they are on the members list.
  const memberCount = members.length + 1;

  const shape = project.shape ?? 'DEPLOYMENT';

  return (
    <Page
      title={project.name}
      description={`${shapeLabel(shape)} · ${project.status.toLowerCase()}`}
    >
      <ProjectOverview
        projectSlug={project.slug}
        shape={shape}
        deploymentOn={project.deploymentOn ?? true}
        instant={instant}
        deployments={deployments}
        domains={domains}
        databases={databases}
        functions={functions}
        emailDomains={resources.emailDomains}
        buckets={buckets}
        memberCount={memberCount}
        whatsapp={false}
        events={events}
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
