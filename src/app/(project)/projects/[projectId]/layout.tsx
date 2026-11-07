import { redirect } from 'next/navigation';

import { getProject, getProjectResources } from '@/lib/api/project';
import { buildProjectMenu, type ProjectRole } from '@/lib/project/menu';
import { ProjectSidebar } from '@/components/project/project-sidebar';

/**
 * The project console.
 *
 * Its menu is **derived** — from the project's shape, its capabilities, what
 * it actually has, and what this person may use. Nothing here is a fixed
 * list of fourteen items.
 */
export default async function ProjectLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;

  const project = await getProject(projectId).catch(() => null);
  if (!project) redirect('/projects');

  const resources = await getProjectResources(project.id).catch(() => ({
    databases: 0,
    functions: 0,
    deployments: 0,
    domains: 0,
    emailDomains: 0,
  }));

  const role = (project.role ?? 'viewer').toLowerCase() as ProjectRole;
  const items = buildProjectMenu({
    projectPath: `/projects/${project.slug}`,
    shape: project.shape ?? 'DEPLOYMENT',
    deploymentOn: project.deploymentOn ?? true,
    capabilities: {
      // Email is on when the project has a mail domain; the registry is the
      // platform's and every project may publish to it; the platform keeps
      // no WhatsApp instances yet.
      email: resources.emailDomains > 0,
      whatsapp: false,
      packages: true,
    },
    resources: {
      functions: resources.functions,
      databases: resources.databases,
      deployments: resources.deployments,
      domains: resources.domains,
    },
    role,
  });

  return (
    <div className="flex min-h-screen bg-canvas">
      <ProjectSidebar
        projectName={project.name}
        projectStatus={project.status}
        items={items}
      />
      <div className="flex min-w-0 flex-1 flex-col">
        <main className="flex-1 overflow-y-auto p-4 sm:p-6">{children}</main>
      </div>
    </div>
  );
}
