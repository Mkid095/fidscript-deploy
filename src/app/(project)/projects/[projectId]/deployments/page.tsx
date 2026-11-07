import Link from 'next/link';
import { redirect } from 'next/navigation';

import { Page } from '@/components/ui/page';

import { getProject } from '@/lib/api/project';
import { getDeployments } from '@/lib/api/resources';
import { Card, PageHeader } from '@/components/ui/card';
import { Badge, EmptyState } from '@/components/ui/feedback';
import { Button } from '@/components/ui/button';

export const metadata = { title: 'Deployments' };

/**
 * The project's deployments.
 *
 * Every deployment the API knows about, newest first — what it is, where it
 * came from, and whether it is live.
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
    <Page>
      <PageHeader
        title="Deployments"
        description={`${deployments.length} so far.`}
        actions={
          <Link href={`/projects/${project.slug}/deployments/new`}>
            <Button variant="primary" size="sm">
              New deployment
            </Button>
          </Link>
        }
      />

      <Card>
        {deployments.length === 0 ? (
          <EmptyState
            title="Nothing has been deployed"
            body="A deployment is a build of your application, running and reachable."
            action={
              <Link href={`/projects/${project.slug}/deployments/new`}>
                <Button variant="primary" size="sm">
                  Deploy your application
                </Button>
              </Link>
            }
          />
        ) : (
          <ul className="divide-y divide-rail">
            {deployments.map((deployment) => (
              <li key={deployment.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
                <div className="min-w-0">
                  <Link
                    href={`/projects/${project.slug}/deployments/${deployment.id}`}
                    className="block truncate text-sm text-text hover:text-accent"
                  >
                    {deployment.release?.version ?? deployment.id}
                  </Link>
                  <p className="mt-0.5 truncate text-xs text-text-dim">
                    {deployment.release?.branch ?? 'no branch'}
                    {deployment.release?.commitSha
                      ? ` · ${deployment.release.commitSha.slice(0, 7)}`
                      : ''}
                    {deployment.release?.commitMessage
                      ? ` · ${deployment.release.commitMessage}`
                      : ''}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge tone={statusTone(deployment.status)}>
                    {deployment.status.toLowerCase()}
                  </Badge>
                  {deployment.deploymentUrl ? (
                    <a
                      href={deployment.deploymentUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-xs text-accent hover:underline"
                    >
                      Open
                    </a>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </Page>
  );
}

function statusTone(status: string): 'success' | 'danger' | 'warning' | 'neutral' {
  if (status === 'SUCCESS') return 'success';
  if (status === 'FAILED') return 'danger';
  if (status === 'BUILDING' || status === 'DEPLOYING' || status === 'QUEUED') return 'warning';
  return 'neutral';
}
