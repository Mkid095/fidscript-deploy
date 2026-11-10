import Link from 'next/link';
import { redirect } from 'next/navigation';

import { Page } from '@/components/ui/page';

import { getProject } from '@/lib/api/project';
import { getDeployments } from '@/lib/api/resources';
import { DeploymentHistory } from '@/components/project/deployment-history';
import { Button } from '@/components/ui/button';

export const metadata = { title: 'Deployments' };

/**
 * The project's deployments.
 *
 * What is live, how healthy the recent builds have been, and every build —
 * read from the platform, newest first. The list, its search and its detail
 * are the platform's own; nothing here is sample data.
 */
export default async function ProjectDeploymentsPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;

  const project = await getProject(projectId).catch(() => null);
  if (!project) redirect('/projects');

  const deployments = await getDeployments(project.id).catch(() => []);

  return (
    <Page
      title="Deployments"
      description={
        deployments.length === 0
          ? 'Nothing has been deployed yet.'
          : `${deployments.length} so far.`
      }
      actions={
        <Link href={`/projects/${project.slug}/deployments/new`}>
          <Button variant="primary" size="sm">
            New deployment
          </Button>
        </Link>
      }
    >
      <DeploymentHistory
        projectId={project.id}
        projectSlug={project.slug}
        deployments={deployments}
        activeId={project.activeDeploymentId ?? null}
      />
    </Page>
  );
}
