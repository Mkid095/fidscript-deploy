import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';

/**
 * The one place that answers "may this caller act on this project?".
 *
 * Three rules, and each of them was broken:
 *
 *  1. **A project key may only reach its own project.** It used to be let
 *     through unconditionally, because the guard was supposed to have
 *     compared the key's project with the route's and had not.
 *  2. **A role check is a role check.** `allowedRoles.includes('owner')` was
 *     true for every call site, so the check returned before the member was
 *     even looked up — a `viewer` could delete the project, mint API keys
 *     and edit environment variables.
 *  3. **Fail closed.** An API-key caller whose project cannot be resolved is
 *     refused, not allowed.
 */
@Injectable()
export class ProjectAccessService {
  constructor(private prisma: PrismaService) {}

  async findProjectWithAccess(
    userId: string,
    projectId: string,
    callerKeyProjectId?: string,
  ) {
    if (userId === 'api-key') {
      // A project key: it may only reach the project it was minted for.
      const keyProjectId = await this.resolveProjectId(callerKeyProjectId);
      const targetProjectId = await this.resolveProjectId(projectId);
      if (!keyProjectId || keyProjectId !== targetProjectId) {
        throw new ForbiddenException('This API key is not valid for this project');
      }
      const project = await this.prisma.project.findUnique({
        where: { id: keyProjectId },
        include: { owner: { select: { id: true, email: true, name: true } } },
      });
      if (!project) throw new NotFoundException('Project not found');
      return project;
    }

    // Accept both UUID (e.g. 9b3a1c2e-...) and slug (e.g. kennedy-test).
    // Try slug first for prettier URLs, fall back to UUID for backwards compat.
    let project = await this.prisma.project.findUnique({
      where: { slug: projectId },
      include: { owner: { select: { id: true, email: true, name: true } } },
    });
    if (!project) {
      project = await this.prisma.project.findUnique({
        where: { id: projectId },
        include: { owner: { select: { id: true, email: true, name: true } } },
      });
    }
    if (!project) throw new NotFoundException('Project not found');
    const isOwner = project.ownerId === userId;
    const isMember = await this.prisma.projectMember.findUnique({
      where: { projectId_userId: { projectId: project.id, userId } },
    });
    // A project in a team is reachable by the team's members: that is what
    // makes it the team's project and not one person's.
    const inWorkspace = project.organizationId
      ? await this.prisma.organizationMember.findUnique({
          where: { organizationId_userId: { organizationId: project.organizationId, userId } },
          select: { id: true },
        })
      : null;
    if (!isOwner && !isMember && !inWorkspace) throw new ForbiddenException('Access denied');
    return project;
  }

  async checkPermission(
    userId: string,
    projectId: string,
    allowedRoles: string[],
    callerKeyProjectId?: string,
  ) {
    if (userId === 'api-key') {
      // A project key carries its own scope: the scopes it was minted with.
      // It may only act on its own project.
      const keyProjectId = await this.resolveProjectId(callerKeyProjectId);
      const targetProjectId = await this.resolveProjectId(projectId);
      if (!keyProjectId || keyProjectId !== targetProjectId) {
        throw new ForbiddenException('This API key is not valid for this project');
      }
      return;
    }

    // Accept both slug and UUID — same dual-lookup as findProjectWithAccess.
    let project = await this.prisma.project.findUnique({ where: { slug: projectId } });
    if (!project) {
      project = await this.prisma.project.findUnique({ where: { id: projectId } });
    }
    if (!project) throw new NotFoundException('Project not found');

    // The project's OWNER always passes. `owner` in the allowed list means a
    // member whose role is owner — it does not mean "anyone who got this far",
    // which is what the old `allowedRoles.includes('owner')` did.
    if (project.ownerId === userId) return;

    const member = await this.prisma.projectMember.findUnique({
      where: { projectId_userId: { projectId: project.id, userId } },
    });
    const memberRole = (member?.role ?? '').toLowerCase();
    if (memberRole && allowedRoles.includes(memberRole)) return;

    // A team member acts with the team's own role on a team project.
    if (project.organizationId) {
      const inWorkspace = await this.prisma.organizationMember.findUnique({
        where: { organizationId_userId: { organizationId: project.organizationId, userId } },
        include: { role: { select: { name: true } } },
      });
      const orgRole = (inWorkspace?.role?.name ?? '').toLowerCase();
      if (orgRole && allowedRoles.includes(orgRole)) return;
    }

    throw new ForbiddenException('Insufficient permissions');
  }

  /** A project's id, from a slug or a UUID. */
  private async resolveProjectId(raw: string | undefined): Promise<string | null> {
    if (!raw) return null;
    const byId = await this.prisma.project.findUnique({
      where: { id: raw },
      select: { id: true },
    });
    if (byId) return byId.id;
    const bySlug = await this.prisma.project.findUnique({
      where: { slug: raw },
      select: { id: true },
    });
    return bySlug?.id ?? null;
  }
}
