import { redirect } from 'next/navigation';

import {
  getInstantApp,
  getProject,
  getProjectEnvVars,
  getProjectMembers,
  getProjectResources,
} from '@/lib/api/project';
import { Card, PageHeader, SectionHeader } from '@/components/ui/card';
import { ErrorState } from '@/components/ui/feedback';
import { ProjectGeneralForm } from '@/components/project/project-general-form';
import { ProjectShapeSection } from '@/components/project/project-shape-section';
import { ProjectCapabilities } from '@/components/project/project-capabilities';
import { ProjectMembers } from '@/components/project/project-members';
import { ProjectEnvVars } from '@/components/project/project-env-vars';
import { ProjectDangerZone } from '@/components/project/project-danger-zone';

export const metadata = { title: 'Settings' };

/**
 * The project's settings.
 *
 * Everything here is a **real** setting on a real project. What the
 * platform cannot yet do is said plainly, rather than dressed up.
 */
export default async function ProjectSettingsPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;

  const project = await getProject(projectId).catch(() => null);
  if (!project) redirect('/projects');

  const role = (project.role ?? 'viewer').toLowerCase();
  if (role !== 'owner' && role !== 'admin') {
    return (
      <div className="mx-auto max-w-3xl">
        <ErrorState
          title="This is not your settings to change"
          message="Only the owner and the admins of a project can change it."
        />
      </div>
    );
  }

  const [instant, members, envVars, resources] = await Promise.all([
    getInstantApp(project.id).catch(() => null),
    getProjectMembers(project.id).catch(() => []),
    getProjectEnvVars(project.id).catch(() => []),
    getProjectResources(project.id).catch(() => ({
      databases: 0,
      functions: 0,
      deployments: 0,
      domains: 0,
      emailDomains: 0,
    })),
  ]);

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <PageHeader title="Settings" description={project.name} />

      <section>
        <SectionHeader title="General" />
        <Card className="p-4">
          <ProjectGeneralForm
            projectId={project.id}
            name={project.name}
            description={project.description ?? ''}
            slug={project.slug}
          />
        </Card>
      </section>

      <ProjectShapeSection
        projectId={project.id}
        shape={project.shape ?? 'DEPLOYMENT'}
        deploymentOn={project.deploymentOn ?? true}
        instant={instant}
      />

      <ProjectCapabilities
        emailDomains={resources.emailDomains}
        projectSlug={project.slug}
      />

      <section>
        <SectionHeader
          title="Members"
          description="Who may work in this project, and what they may do."
        />
        <Card>
          <ProjectMembers members={members} />
        </Card>
      </section>

      <section>
        <SectionHeader title="Environment" description="The variables this project ships with." />
        <Card>
          <ProjectEnvVars variables={envVars} />
        </Card>
      </section>

      <section>
        <SectionHeader title="Danger zone" />
        <Card className="p-4">
          <ProjectDangerZone projectId={project.id} name={project.name} status={project.status} />
        </Card>
      </section>
    </div>
  );
}
