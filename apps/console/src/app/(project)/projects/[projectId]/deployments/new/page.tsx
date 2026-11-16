import { redirect } from 'next/navigation';

import { Page } from '@/components/ui/page';

import { getProject } from '@/lib/api/project';
import { getDomains, getDeployments } from '@/lib/api/resources';
import { Card } from '@/components/ui/card';
import { DeploymentWizard } from '@/components/project/deployment-wizard';
import { QuickRedeploy } from '@/components/project/deployment-quick-redeploy';

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

  // The quick path: a project that has deployed before is not made to redo
  // the wizard for the same source — the newest attempt is one press away.
  const latest = deployments[0] ?? null;
  const quick =
    latest?.release?.sourceUrl
      ? {
          version: latest.release.version ?? 'the last deployment',
          lastFailed: latest.status.toUpperCase() === 'FAILED',
          gitUrl: latest.release.sourceUrl,
          branch: latest.release.branch ?? 'main',
        }
      : null;

  return (
    <Page
      title="New deployment"
      description={`Deploying into ${project.name}.`}
    >
      {quick ? (
        <QuickRedeploy
          projectId={project.id}
          projectSlug={project.slug}
          version={quick.version}
          lastFailed={quick.lastFailed}
          gitUrl={quick.gitUrl}
          branch={quick.branch}
        />
      ) : null}
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
