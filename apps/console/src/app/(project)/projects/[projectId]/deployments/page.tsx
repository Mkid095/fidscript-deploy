import Link from 'next/link';
import { redirect } from 'next/navigation';

import { Page } from '@/components/ui/page';

import { getProject } from '@/lib/api/project';
import {
  getDeployments,
  getGitIntegration,
} from '@/lib/api/resources';
import { DeploymentHistory } from '@/components/project/deployment-history';
import { GitIntegrationCard } from '@/components/project/git-integration-card';
import { DeployNewVersionButton } from '@/components/project/deploy-new-version-button';
import { Button } from '@/components/ui/button';

export const metadata = { title: 'Deployments' };

/**
 * The project's deployments.
 *
 * What is live, how healthy the recent builds have been, and every build —
 * read from the platform, newest first. The list, its search and its detail
 * are the platform's own; nothing here is sample data.
 *
 * A project is initialized once: the first deployment sets up its
 * deployment — the name it answers on, the production it runs, the
 * history it keeps. After that, every deployment on this screen is a
 * version of it, and the button above says which one this is.
 */
export default async function ProjectDeploymentsPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;

  const project = await getProject(projectId).catch(() => null);
  if (!project) redirect('/projects');

  const [deployments, git] = await Promise.all([
    getDeployments(project.id).catch(() => []),
    getGitIntegration(project.id).catch(() => null),
  ]);

  const initialized = git?.deploymentInitialized ?? deployments.length > 0;

  // The latest attempt's source — the next version builds from it.
  const latest = deployments[0] ?? null;
  const latestSourceUrl =
    latest?.release?.sourceUrl?.startsWith('http') ? latest.release.sourceUrl : null;

  let actions;
  if (!initialized || !latestSourceUrl) {
    // Uninitialized — or initialized with no Git source yet: the
    // initializer is the screen that fits.
    actions = (
      <Link href={`/projects/${project.slug}/deployments/new`}>
        <Button variant="primary" size="sm">
          {initialized ? 'Deploy new version' : 'Initialize deployment'}
        </Button>
      </Link>
    );
  } else {
    // Initialized with a Git source: the next version is one press.
    actions = (
      <DeployNewVersionButton
        projectId={project.id}
        version={latest!.release!.version ?? 'the last deployment'}
        lastFailed={latest!.status.toUpperCase() === 'FAILED'}
        gitUrl={latestSourceUrl}
        branch={latest!.release!.branch ?? 'main'}
      />
    );
  }

  return (
    <Page
      title="Deployments"
      description={
        deployments.length === 0
          ? 'Initialize the deployment to put the project live.'
          : `${deployments.length} so far.`
      }
      actions={actions}
    >
      {git ? (
        <GitIntegrationCard
          projectId={project.id}
          projectSlug={project.slug}
          status={git}
        />
      ) : null}
      <DeploymentHistory
        projectId={project.id}
        projectSlug={project.slug}
        deployments={deployments}
        activeId={project.activeDeploymentId ?? null}
      />
    </Page>
  );
}
