import { redirect } from 'next/navigation';

import { getProject, getProjectResources } from '@/lib/api/project';
import { buildProjectMenu, type ProjectRole } from '@/lib/project/menu';
import { ProjectSidebar } from '@/components/project/project-sidebar';
import { ResponsiveSidebar } from '@/components/shell/responsive-sidebar';

/**
 * The project console.
 *
 * Its menu is **derived** — from the project's shape, its capabilities, what
 * it actually has, and what this person may use. Nothing here is a fixed
 * list of fourteen items.
 *
 * The shell is two columns that each scroll on their own: the menu stays
 * where it is, and the work scrolls beside it.
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
      // Email and packages are capabilities, not contents: the menu offers
      // the door and the page says what is inside it. A project without a
      // mail domain still gets the item — the page is where it adds one.
      // (Gating the door on the room being furnished made the capability
      // unreachable for a new project.) The platform keeps no WhatsApp
      // instances yet.
      email: true,
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
    <div className="flex h-screen overflow-hidden bg-canvas">
      <ResponsiveSidebar>
        <ProjectSidebar
          projectName={project.name}
          projectStatus={project.status}
          items={items}
        />
      </ResponsiveSidebar>
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <main className="scroll-area flex-1 overflow-y-auto">{children}</main>
      </div>
    </div>
  );
}
