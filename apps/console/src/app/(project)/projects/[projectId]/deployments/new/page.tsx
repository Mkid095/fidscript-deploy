import { redirect } from 'next/navigation';

import { Page } from '@/components/ui/page';

import { getProject } from '@/lib/api/project';
import { getDomains, getDeployments } from '@/lib/api/resources';
import { Card } from '@/components/ui/card';
import { DeploymentWizard } from '@/components/project/deployment-wizard';

export const metadata = { title: 'New deployment' };

/**
 * A new deployment.
 *
 * From a repository to a running application, in four steps.
 */
export default async function NewDeploymentPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;

  const project = await getProject(projectId).catch(() => null);
  if (!project) redirect('/projects');

  if (project.deploymentOn === false) {
    redirect(`/projects/${project.slug}/overview`);
  }

  const [domains, deployments] = await Promise.all([
    getDomains(project.id).catch(() => []),
    getDeployments(project.id).catch(() => []),
  ]);

  // What is up right now, if anything. A new deployment replaces it, so the
  // wizard says so and asks for the plain yes before it takes the name.
  const live = deployments.find(
    (deployment) => deployment.status.toUpperCase() === 'SUCCESS',
  );
  const liveDeploymentLabel = live
    ? live.release?.version
      ? `the deployment ${live.release.version}`
      : 'your live deployment'
    : null;

  return (
    <Page
      title="New deployment"
      description={`Deploying into ${project.name}.`}
    >
      <Card className="p-4">
        <DeploymentWizard
          projectId={project.id}
          projectSlug={project.slug}
          domains={domains.map((domain) => ({
            id: domain.id,
            domain: domain.domain,
            dnsStatus: domain.dnsStatus ?? 'pending',
            attached: Boolean(domain.deploymentId),
          }))}
          liveDeploymentLabel={liveDeploymentLabel}
        />
      </Card>
    </Page>
  );
}
