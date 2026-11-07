import { redirect } from 'next/navigation';

import { Page } from '@/components/ui/page';

import { getProject } from '@/lib/api/project';
import { Card, PageHeader } from '@/components/ui/card';
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

  return (
    <Page>
      <PageHeader
        title="New deployment"
        description={`Deploying into ${project.name}.`}
      />
      <Card className="p-4">
        <DeploymentWizard projectId={project.id} projectSlug={project.slug} />
      </Card>
    </Page>
  );
}
