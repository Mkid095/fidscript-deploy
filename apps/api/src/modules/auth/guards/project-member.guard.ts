import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';

/**
 * Guard that verifies the calling identity is a member OR owner of the
 * project identified by the `:projectId` route parameter.
 *
 * Must run AFTER `JwtAuthGuard` (or `ApiKeyOrJwtGuard`). On the JWT path it
 * reads `request.user.userId`; on the API-key path it trusts the upstream
 * guard which has already proven the key's project matches `:projectId`
 * (and attaches `userId = 'api-key'`). The single Prisma lookup is
 * indexed via the composite unique key `ProjectMember(projectId, userId)`.
 *
 * Accepts both UUID (e.g. `9b3a1c2e-...`) and slug (e.g. `kennedy-test`)
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
    const user = request.user as { userId?: string; isApiKey?: boolean } | undefined;
    const userId = user?.userId;

    if (!userId) {
      throw new ForbiddenException('Authentication required');
    }

    // API-key callers were already scoped to the URL :projectId by
    // ApiKeyOrJwtGuard — trust that and pass through.
    if (user.isApiKey) {
      return true;
    }

    // Support both :projectId and :id route parameter names — ProjectsMembersController
    // uses :id while other controllers use :projectId.
    const rawId = request.params?.projectId ?? request.params?.id;
    if (!rawId) {
      throw new ForbiddenException('Missing projectId in route');
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
}