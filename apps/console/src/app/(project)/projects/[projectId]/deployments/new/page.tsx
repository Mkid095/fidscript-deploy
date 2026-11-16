import Link from 'next/link';
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

export const metadata = { title: 'New deployment' };

/**
 * A new deployment.
 *
 * From a repository to a running application, in four steps.
 *
 * A project is initialized once: this screen is the initializer while the
 * project has no deployment yet, and the version screen afterwards. The
 * platform enforces the one-deployment rule itself — a second identity is
 * impossible — and the screen says so instead of letting the wizard
 * pretend a new deployment would make a new one.
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

  // Initialized when the project has a deployment identity — which the
  // first deployment created and nothing since can replace.
  const initialized = git?.deploymentInitialized ?? deployments.length > 0;

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
      title={initialized ? 'Deploy new version' : 'Initialize deployment'}
      description={
        initialized
          ? `The next version of ${project.name}’s deployment.`
          : `The first deployment of ${project.name} — the one it will keep, with every push a new version of it.`
      }
    >
      {initialized ? (
        <Card className="mb-3 p-4">
          <p className="text-sm text-text">
            This project has already been initialized with a deployment. New
            deployments will update the existing project deployment rather
            than create a separate deployment.
          </p>
          <Link
            href={`/projects/${project.slug}/deployments`}
            className="mt-2 inline-block text-xs text-accent hover:underline"
          >
            Back to the deployments — the current one, the history, the
            rollback
          </Link>
        </Card>
      ) : null}

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
