import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';

/**
 * Guard that verifies the calling identity may act on the project identified
 * by the `:projectId` route parameter.
 *
 * Must run AFTER `JwtAuthGuard` (or `ApiKeyOrJwtGuard`). On the JWT path it
 * reads `request.user.userId`; on the API-key path it enforces the key's own
 * scope.
 *
 * Accepts both UUID (e.g. 9b3a1c2e-...) and slug (e.g. kennedy-test)
 * for backwards-compat with existing routes — mirrors `ProjectAccessService`.
 *
 * Apply as the second guard in the chain:
 *   `@UseGuards(JwtAuthGuard, ProjectMemberGuard)`
 *   `@UseGuards(ApiKeyOrJwtGuard, ProjectMemberGuard)`
 */
@Injectable()
export class ProjectMemberGuard implements CanActivate {
  constructor(private prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user as
      | { userId?: string; isApiKey?: boolean; keyType?: string; projectId?: string }
      | undefined;
    const caller = user;
    let userId = caller?.userId;

    if (!userId || !caller) {
      throw new ForbiddenException('Authentication required');
    }

    // Support both :projectId and :id route parameter names — ProjectsMembersController
    // uses :id while other controllers use :projectId.
    const rawId = request.params?.projectId ?? request.params?.id;
    if (!rawId) {
      throw new ForbiddenException('Missing projectId in route');
    }

    // A PROJECT key (fpk_) belongs to exactly one project, and may only ever
    // reach that project.
    //
    // It used to pass through unconditionally, on the strength of a comment
    // claiming the upstream guard had already compared the key's project with
    // the URL's. It had not: the guard ATTACHED the key's project and never
    // compared it. A key minted for one project could therefore read, rename
    // and delete another project's resources — including its database
    // connection string, with the password in it.
    if (caller.isApiKey) {
      if (caller.keyType === 'account') {
        // An ACCOUNT key (fsk_) belongs to a person and acts with that
        // person's rights, so the membership check below runs for it as it
        // does for a session. Its user id is already the person's.
        userId = caller.userId as string;
      } else if (caller.keyType === 'project') {
        const keyProjectId = await this.resolveProjectId(caller.projectId);
        const routeProjectId = await this.resolveProjectId(rawId);
        if (!keyProjectId || keyProjectId !== routeProjectId) {
          throw new ForbiddenException('This API key is not valid for this project');
        }
        return true;
      } else {
        // A credential whose kind is unknown is not trusted.
        throw new ForbiddenException('Unsupported credential');
      }
    }

    // Dual-lookup: slug first (prettier URLs), UUID fallback.
    let project = await this.prisma.project.findUnique({
      where: { slug: rawId },
      select: { id: true, ownerId: true },
    });
    if (!project) {
      project = await this.prisma.project.findUnique({
        where: { id: rawId },
        select: { id: true, ownerId: true },
      });
    }
    if (!project) {
      throw new NotFoundException('Project not found');
    }

    if (project.ownerId === userId) {
      return true;
    }

    const membership = await this.prisma.projectMember.findUnique({
      where: { projectId_userId: { projectId: project.id, userId } },
      select: { id: true },
    });

    if (!membership) {
      throw new ForbiddenException('Access denied: not a project member');
    }

    return true;
  }

  /**
   * The project's id, from a slug or a UUID.
   *
   * A key's project is stored as a UUID and the route may carry a slug, so
   * both sides of the comparison have to be resolved before they can be
   * compared.
   */
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
