import Link from 'next/link';
import { redirect } from 'next/navigation';

import { getProject } from '@/lib/api/project';
import { getDomains } from '@/lib/api/resources';
import { getDeployment, getDeploymentLogs } from '@/lib/api/resources';
import { Card, SectionHeader } from '@/components/ui/card';
import { Page } from '@/components/ui/page';
import { Badge } from '@/components/ui/feedback';
import { Button } from '@/components/ui/button';
import { DeploymentActions } from '@/components/project/deployment-actions';
import { DeploymentLiveLog } from '@/components/project/deployment-live-log';
import { DeploymentBuildSection } from '@/components/project/deployment-build-section';
import { DeploymentDomains } from '@/components/project/deployment-domains';

export const metadata = { title: 'Deployment' };

/**
 * One deployment.
 *
 * What it is, where it answers, what the build said, and what can be done
 * to it — stop it, start it again, roll back, or take it away.
 */
export default async function DeploymentPage({
  params,
}: {
  params: Promise<{ projectId: string; deploymentId: string }>;
}) {
  const { projectId, deploymentId } = await params;

  const project = await getProject(projectId).catch(() => null);
  if (!project) redirect('/projects');

  const deployment = await getDeployment(project.id, deploymentId).catch(
    () => null,
  );
  if (!deployment) {
    redirect(`/projects/${project.slug}/deployments`);
  }

  const logs = await getDeploymentLogs(project.id, deploymentId);
  const domains = await getDomains(project.id).catch(() => []);
  const base = `/projects/${project.slug}`;

  return (
    <Page
      title={deployment.release?.version ?? 'The deployment'}
      description={`${deployment.status.toLowerCase()} · ${
        deployment.release?.branch ?? 'no branch'
      }`}
    >
      <section>
        <SectionHeader title="What it is" />
        <Card className="divide-y divide-rail">
          <Row term="Status">
            <Badge
              tone={
                deployment.status.toUpperCase() === 'SUCCESS'
                  ? 'success'
                  : deployment.status.toUpperCase() === 'FAILED'
                    ? 'danger'
                    : 'warning'
              }
            >
              {deployment.status.toLowerCase()}
            </Badge>
          </Row>
          <Row term="Commit">
            <span className="font-mono text-xs">
              {deployment.release?.commitSha?.slice(0, 7) ?? '—'}
            </span>
          </Row>
          <Row term="Message">{deployment.release?.commitMessage ?? '—'}</Row>
          <Row term="Repository">{deployment.release?.sourceUrl ?? '—'}</Row>
          <Row term="Made">
            {new Date(deployment.createdAt).toLocaleString()}
          </Row>
          <Row term="Answers at">
            {deployment.deploymentUrl ? (
              <a
                href={deployment.deploymentUrl}
                target="_blank"
                rel="noreferrer"
                className="text-accent hover:underline"
              >
                {deployment.deploymentUrl}
              </a>
            ) : (
              '—'
            )}
          </Row>
        </Card>
      </section>

      <section>
        <SectionHeader title="What can be done" />
        <Card className="p-4">
          <DeploymentActions
            projectId={project.id}
            deploymentId={deployment.id}
            status={deployment.status}
            autoDeploy={project.autoDeploy ?? true}
            gitUrl={deployment.release?.sourceUrl ?? null}
            branch={deployment.release?.branch ?? null}
          />
          <div className="mt-4 flex flex-wrap gap-2 border-t border-rail pt-4">
            <Link href={`${base}/domains`}>
              <Button variant="secondary" size="sm">
                Add a domain
              </Button>
            </Link>
            <Link href={`${base}/deployments`}>
              <Button variant="ghost" size="sm">
                All deployments
              </Button>
            </Link>
          </div>
        </Card>
      </section>

      <section>
        <SectionHeader
          title="The names it answers on"
          description="Its own address under the platform's domain, and any name of the project's that is pointed here."
        />
        <Card className="p-4">
          <DeploymentDomains
            projectId={project.id}
            deploymentId={deployment.id}
            domains={domains.map((entry) => ({
              id: entry.id,
              domain: entry.domain,
              deploymentId:
                (entry as { deploymentId?: string | null }).deploymentId ??
                null,
            }))}
          />
        </Card>
      </section>

      <section>
        <SectionHeader
          title="The application's log"
          description="What it writes while it runs."
        />
        <DeploymentLiveLog
          projectSlug={project.slug}
          deploymentId={deployment.id}
        />
      </section>

      <section>
        <SectionHeader
          title="The build log"
          description="What the build said, while it says it — and why it ended the way it ended."
        />
        <DeploymentBuildSection
          projectId={project.id}
          deploymentId={deployment.id}
          initialStatus={deployment.status}
          initialLogs={logs ?? ''}
        />
      </section>
    </Page>
  );
}

function Row({ term, children }: { term: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 px-4 py-2.5">
      <span className="text-sm text-text-muted">{term}</span>
      <span className="min-w-0 truncate text-sm text-text">{children}</span>
    </div>
  );
}
