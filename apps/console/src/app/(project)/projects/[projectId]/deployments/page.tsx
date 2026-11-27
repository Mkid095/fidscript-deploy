import Link from 'next/link';
import { redirect } from 'next/navigation';

import { Page } from '@/components/ui/page';

import { getProject } from '@/lib/api/project';
import {
  getDeployments,
  getGitIntegration,
  getBuildConfig,
  liveDeployment,
} from '@/lib/api/resources';
import { DeploymentHistory } from '@/components/project/deployment-history';
import { DeploymentProjectHeader } from '@/components/project/deployment-project-header';
import { GitIntegrationCard } from '@/components/project/git-integration-card';
import { ResourcesCard } from '@/components/project/resources-card';
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
 * history it keeps. After that, new versions come from pushes to the
 * connected branch; the header says what the platform does on its own,
 * and there is no button for it. The button remains only where no webhook
 * can detect anything: before the first deployment, and on a project that
 * is initialized but not connected to Git.
 */
export default async function ProjectDeploymentsPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;

  const project = await getProject(projectId).catch(() => null);
  if (!project) redirect('/projects');

  const [deployments, git, buildConfig] = await Promise.all([
    getDeployments(project.id).catch(() => []),
    getGitIntegration(project.id).catch(() => null),
    getBuildConfig(project.id),
  ]);

  const initialized = git?.deploymentInitialized ?? deployments.length > 0;

  // What is live right now, for the header — the newest successful
  // deployment, the same read the top bar makes.
  const live = liveDeployment(deployments);
  const is = (s: string | null | undefined, w: string) => (s ?? '').toUpperCase() === w;
  const inFlight = deployments.some((d) =>
    ['QUEUED', 'PENDING', 'BUILDING', 'DEPLOYING'].some((s) => is(d.status, s)),
  );
  let liveUrl: string | null = null;
  let liveState: 'live' | 'building' | 'none' = 'none';
  if (live) {
    liveUrl = live.deploymentUrl;
    liveState = 'live';
  } else if (inFlight) {
    liveState = 'building';
  }

  // The latest attempt's source — where the next version builds from.
  const latest = deployments[0] ?? null;
  const latestSourceUrl =
    latest?.release?.sourceUrl?.startsWith('http') ? latest.release.sourceUrl : null;

  let actions;
  if (!initialized) {
    // Uninitialized: the initializer is the screen that fits.
    actions = (
      <Link href={`/projects/${project.slug}/deployments/new`}>
        <Button variant="primary" size="sm">
          Initialize deployment
        </Button>
      </Link>
    );
  } else if (!git?.connected) {
    // No Git connection, no webhook to detect pushes with: the one-press
    // deploy of the newest commit is the only way a new version arrives.
    actions = latestSourceUrl ? (
      <DeployNewVersionButton
        projectId={project.id}
        version={latest!.release!.version ?? 'the last deployment'}
        lastFailed={latest!.status.toUpperCase() === 'FAILED'}
        gitUrl={latestSourceUrl}
        branch={latest!.release!.branch ?? 'main'}
      />
    ) : (
      <Link href={`/projects/${project.slug}/deployments/new`}>
        <Button variant="primary" size="sm">
          Deploy new version
        </Button>
      </Link>
    );
  }
  // Connected to Git: new versions come from pushes; the header carries
  // the status, and there is no button for it.

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
      <DeploymentProjectHeader
        projectName={project.name}
        liveUrl={liveUrl}
        liveState={liveState}
        git={git}
      />
      {git ? (
        <GitIntegrationCard
          projectId={project.id}
          projectSlug={project.slug}
          status={git}
        />
      ) : null}
      <ResourcesCard projectId={project.id} buildConfig={buildConfig} />
      <DeploymentHistory
        projectId={project.id}
        projectSlug={project.slug}
        deployments={deployments}
        activeId={live?.id ?? null}
      />
    </Page>
  );
}
