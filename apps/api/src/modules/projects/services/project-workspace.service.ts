import { Injectable, ForbiddenException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';

/**
 * The workspace a project lives in.
 *
 * A project belongs to the owner's own workspace, or to a team — an
 * organization. When it belongs to a team, the team's members can see it and
 * work in it; that is what makes it the team's project rather than one
 * person's.
 */
@Injectable()
export class ProjectWorkspaceService {
  constructor(private prisma: PrismaService) {}

  /**
   * Check that the person may put a project in this workspace.
   *
   * A workspace with no members row for the person is not theirs, and they
   * cannot create anything in it.
   */
  async assertMember(userId: string, organizationId: string): Promise<void> {
    const organization = await this.prisma.organization.findUnique({
      where: { id: organizationId },
      select: { id: true },
    });
    if (!organization) throw new NotFoundException('Workspace not found');

    const member = await this.prisma.organizationMember.findUnique({
      where: { organizationId_userId: { organizationId, userId } },
      select: { id: true },
    });
    if (!member) {
      throw new ForbiddenException('You are not a member of that workspace');
    }
  }

  /**
   * The workspaces the person belongs to, by id.
   *
   * Used to widen the project list: a project in a team the person is in is
   * theirs to work in, even though they did not create it.
   */
  async workspaceIds(userId: string): Promise<string[]> {
    const memberships = await this.prisma.organizationMember.findMany({
      where: { userId },
      select: { organizationId: true },
    });
    return memberships.map(m => m.organizationId);
  }
}
