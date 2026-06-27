import { Injectable, Logger } from '@nestjs/common';
import { Socket } from 'socket.io';
import { PrismaService } from '@/prisma/prisma.service';
import { projectRoom } from './realtime-rooms';

/**
 * Phase 13 — project-room authorization, the gatekeeper for platform-event
 * fan-out.
 *
 * The bridge broadcasts every project-scoped platform event to `project:<id>`.
 * A client may join that room ONLY after we confirm it is authorized for the
 * project — mirroring ProjectAccessService's rule: the owner OR an explicit
 * ProjectMember (the owner lives on Project.ownerId, NOT in ProjectMember).
 * This is the structural authorization boundary, so the bridge never re-checks
 * membership per event. Non-members and non-owners are refused (the "join
 * project B as member of A → 403" prove-it).
 */
@Injectable()
export class RealtimeSubscriptionService {
  private readonly logger = new Logger(RealtimeSubscriptionService.name);

  constructor(private readonly prisma: PrismaService) {}

  async subscribeToProject(
    client: Socket,
    identity: { userId: string; projectId?: string; isApiKey?: boolean },
    projectId: string,
  ): Promise<{ success: boolean; projectId?: string; error?: string }> {
    // BaaS path: a project API key authorizes access to that project's room
    // only — the key's project must match the requested project.
    if (identity.isApiKey) {
      if (!identity.projectId || identity.projectId !== projectId) {
        return { success: false, error: 'Not a member of this project' };
      }
      client.join(projectRoom(projectId));
      return { success: true, projectId };
    }

    const [project, member] = await Promise.all([
      this.prisma.project.findUnique({
        where: { id: projectId },
        select: { ownerId: true },
      }),
      this.prisma.projectMember.findUnique({
        where: { projectId_userId: { projectId, userId: identity.userId } },
        select: { id: true, role: true },
      }),
    ]);

    if (!project) {
      return { success: false, error: 'Project not found' };
    }
    const authorized = project.ownerId === identity.userId || !!member;
    if (!authorized) {
      this.logger.debug(
        `subscribe denied: user ${identity.userId} is neither owner nor member of project ${projectId}`,
      );
      return { success: false, error: 'Not a member of this project' };
    }

    client.join(projectRoom(projectId));
    return { success: true, projectId };
  }

  unsubscribeFromProject(client: Socket, projectId: string): { success: boolean } {
    client.leave(projectRoom(projectId));
    return { success: true };
  }
}
