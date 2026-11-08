import Link from 'next/link';
import { redirect } from 'next/navigation';

import { Page } from '@/components/ui/page';

import { getProject } from '@/lib/api/project';
import { getDeployments } from '@/lib/api/resources';
import { Card } from '@/components/ui/card';
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
    <Page
      title="Deployments"
      description={`${deployments.length} so far.`}
      actions={
        <Link href={`/projects/${project.slug}/deployments/new`}>
          <Button variant="primary" size="sm">
            New deployment
          </Button>
        </Link>
      }
    >
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
              <li
                key={deployment.id}
                className="flex flex-wrap items-center justify-between gap-3 px-4 py-3"
              >
                <div className="min-w-0">
                  <Link
                    href={`/projects/${project.slug}/deployments/${deployment.id}`}
                    className="block truncate text-sm text-text hover:text-accent"
                  >
                    {deploymentLabel(deployment)}
                  </Link>
                  <p className="mt-0.5 truncate text-xs text-text-dim">
                    {deploymentSubline(deployment)}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {project.activeDeploymentId === deployment.id ? (
                    <Badge tone="accent">live</Badge>
                  ) : null}
                  <Badge tone={statusTone(deployment.status)}>
                    {statusLabel(deployment.status)}
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

function statusTone(
  status: string,
): 'success' | 'danger' | 'warning' | 'neutral' {
  if (status === 'SUCCESS') return 'success';
  if (status === 'FAILED') return 'danger';
  if (status === 'BUILDING' || status === 'DEPLOYING' || status === 'QUEUED')
    return 'warning';
  return 'neutral';
}

/** A deployment's name: its release when there is one, its date when not. */
function deploymentLabel(deployment: {
  id: string;
  createdAt: string;
  release?: { version: string | null } | null;
}): string {
  return (
    deployment.release?.version ??
    `Deploy · ${new Date(deployment.createdAt).toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
    })} ${new Date(deployment.createdAt).toLocaleTimeString(undefined, {
      hour: '2-digit',
      minute: '2-digit',
    })}`
  );
}

/** The line under the name: branch and commit when they exist, the source when they do not. */
function deploymentSubline(deployment: {
  createdAt: string;
  release?: {
    branch: string | null;
    commitSha: string | null;
    commitMessage: string | null;
    sourceUrl: string | null;
  } | null;
}): string {
  const release = deployment.release;
  if (release?.branch || release?.commitSha) {
    return [
      release.branch ?? 'no branch',
      release.commitSha ? release.commitSha.slice(0, 7) : null,
      release.commitMessage,
    ]
      .filter(Boolean)
      .join(' · ');
  }
  const source = release?.sourceUrl ?? '';
  const repo = source
    .replace(/^https?:\/\//, '')
    .replace(/\.git$/, '')
    .split('/')
    .slice(-2)
    .join('/');
  return repo
    ? `from ${repo}`
    : new Date(deployment.createdAt).toLocaleString();
}

/** The words a status earns: a blocked build is waiting its turn, not broken. */
function statusLabel(status: string): string {
  if (status === 'BLOCKED') return 'queued behind the live build';
  return status.toLowerCase();
}
