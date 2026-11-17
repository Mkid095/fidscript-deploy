import { redirect } from 'next/navigation';

import { Page } from '@/components/ui/page';

import { getProject } from '@/lib/api/project';
import {
  getDomains,
  getDeployments,
  getGitIntegration,
} from '@/lib/api/resources';
import { Card } from '@/components/ui/card';
import { DeploymentWizard } from '@/components/project/deployment-wizard';
import { QuickRedeploy } from '@/components/project/deployment-quick-redeploy';
import { DeploymentAlreadyInitialized } from '@/components/project/deployment-already-initialized';

export const metadata = { title: 'Deployment' };

/**
 * A new deployment.
 *
 * From a repository to a running application, in four steps.
 *
 * This route is the initializer. A project is initialized once — the
 * platform enforces the one-deployment rule in the database — so a project
 * that is already initialized (and has a Git source to build the next
 * version from) is not shown the initializer: it reads what happened,
 * and lands on the deployments screen, where the next version is one
 * press away.
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

  const [domains, deployments, git] = await Promise.all([
    getDomains(project.id).catch(() => []),
    getDeployments(project.id).catch(() => []),
    getGitIntegration(project.id).catch(() => null),
  ]);

  const initialized = git?.deploymentInitialized ?? deployments.length > 0;

  // The latest attempt's source — what the next version builds from.
  const latest = deployments[0] ?? null;
  const latestSourceUrl =
    latest?.release?.sourceUrl?.startsWith('http') ? latest.release.sourceUrl : null;

  const backHref = `/projects/${project.slug}/deployments`;

  // Already initialized, and a Git source to build the next version from:
  // the initializer is not the screen this person is on.
  if (initialized && latestSourceUrl) {
    return (
      <Page
        title="Deploy new version"
        description={`The next version of ${project.name}’s deployment.`}
      >
        <DeploymentAlreadyInitialized backHref={backHref} />
      </Page>
    );
  }

  // What is up right now, if anything. A new deployment replaces it, so
  // the wizard says so and asks for the plain yes before it takes the
  // name.
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
  const quick =
    latestSourceUrl
      ? {
          version: latest!.release!.version ?? 'the last deployment',
          lastFailed: latest!.status.toUpperCase() === 'FAILED',
          gitUrl: latestSourceUrl,
          branch: latest!.release!.branch ?? 'main',
        }
      : null;

  return (
    <Page
      title={initialized ? 'Deploy new version' : 'Initialize deployment'}
      description={
        initialized
          ? `The next version of ${project.name}’s deployment — the source, the branch or the settings change.`
          : `The first deployment of ${project.name} — the one it will keep, with every push a new version of it.`
      }
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
