import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { ProjectWorkspaceService } from '@/modules/projects/services/project-workspace.service';

/**
 * The platform overview — what is happening across the projects a person can
 * reach.
 *
 * Every number here is counted over **the caller's own projects**: the ones
 * they own, the ones they are a member of, and the ones their workspaces
 * own. Nothing is counted over the platform as a whole, so the answer is
 * about their work and never about somebody else's — or about the
 * infrastructure.
 */
@Injectable()
export class OverviewService {
  constructor(
    private prisma: PrismaService,
    private workspace: ProjectWorkspaceService,
  ) {}

  async overview(userId: string) {
    const projectIds = await this.accessibleProjectIds(userId);
    const projects = await this.prisma.project.findMany({
      where: { id: { in: projectIds }, deletedAt: null },
      select: {
        id: true, name: true, slug: true, type: true, status: true, updatedAt: true,
      },
      orderBy: { updatedAt: 'desc' },
    });

    const byStatus: Record<string, number> = {};
    for (const project of projects) {
      const status = project.status ?? 'UNKNOWN';
      byStatus[status] = (byStatus[status] ?? 0) + 1;
    }

    const [deployments, alerts, activity] = await Promise.all([
      this.deployments(projectIds),
      this.alerts(projectIds),
      this.activity(projectIds),
    ]);

    return {
      projects: {
        total: projects.length,
        byStatus,
        recent: projects.slice(0, 5).map((p) => ({
          id: p.id,
          name: p.name,
          slug: p.slug,
          type: p.type,
          status: p.status,
          updatedAt: p.updatedAt,
        })),
      },
      deployments,
      alerts,
      activity,
    };
  }

  /** The deployments across the caller's projects, and the failures. */
  private async deployments(projectIds: string[]) {
    if (projectIds.length === 0) {
      return { total: 0, running: 0, failed: 0, recent: [], failures: [] };
    }
    const rows = await this.prisma.deployment.findMany({
      where: { projectId: { in: projectIds } },
      select: {
        id: true,
        projectId: true,
        status: true,
        deploymentUrl: true,
        createdAt: true,
        completedAt: true,
        project: { select: { name: true, slug: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    const running = rows.filter((d) =>
      ['PENDING', 'QUEUED', 'BUILDING', 'DEPLOYING'].includes(d.status),
    ).length;
    const failed = rows.filter((d) => d.status === 'FAILED').length;

    const shape = (d: (typeof rows)[number]) => ({
      id: d.id,
      projectId: d.projectId,
      projectName: d.project.name,
      projectSlug: d.project.slug,
      status: d.status,
      deploymentUrl: d.deploymentUrl,
      createdAt: d.createdAt,
      completedAt: d.completedAt,
    });

    return {
      total: rows.length,
      running,
      failed,
      recent: rows.slice(0, 5).map(shape),
      failures: rows.filter((d) => d.status === 'FAILED').slice(0, 5).map(shape),
    };
  }

  /** The alerts across the caller's projects. */
  private async alerts(projectIds: string[]) {
    if (projectIds.length === 0) return { firing: 0, recent: [] };
    const rows = await this.prisma.alert.findMany({
      where: { projectId: { in: projectIds } },
      select: {
        id: true,
        projectId: true,
        severity: true,
        status: true,
        message: true,
        createdAt: true,
        firedAt: true,
        project: { select: { name: true, slug: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });

    return {
      firing: rows.filter((a) => a.status !== 'resolved').length,
      recent: rows.slice(0, 5).map((a) => ({
        id: a.id,
        projectId: a.projectId,
        projectName: a.project.name,
        projectSlug: a.project.slug,
        severity: a.severity,
        status: a.status,
        message: a.message,
        createdAt: a.createdAt,
        firedAt: a.firedAt,
      })),
    };
  }

  /** The activity feed across the caller's projects. */
  private async activity(projectIds: string[]) {
    if (projectIds.length === 0) return [];
    const rows = await this.prisma.platformEvent.findMany({
      where: { projectId: { in: projectIds } },
      select: {
        id: true,
        type: true,
        resourceType: true,
        resourceId: true,
        projectId: true,
        timestamp: true,
        metadata: true,
      },
      orderBy: { timestamp: 'desc' },
      take: 10,
    });

    const names = await this.projectNames(projectIds);
    return rows.map((event) => ({
      id: event.id,
      eventType: event.type,
      resourceType: event.resourceType,
      resourceId: event.resourceId,
      projectName: event.projectId ? names[event.projectId] ?? null : null,
      timestamp: event.timestamp,
      metadata: event.metadata,
    }));
  }

  /** The ids of the caller's projects: their own, and their workspaces'. */
  private async accessibleProjectIds(userId: string): Promise<string[]> {
    const workspaceIds = await this.workspace.workspaceIds(userId);
    const projects = await this.prisma.project.findMany({
      where: {
        deletedAt: null,
        OR: [
          { ownerId: userId },
          { members: { some: { userId } } },
          ...(workspaceIds.length ? [{ organizationId: { in: workspaceIds } }] : []),
        ],
      },
      select: { id: true },
    });
    return projects.map((p) => p.id);
  }

  private async projectNames(projectIds: string[]): Promise<Record<string, string>> {
    const rows = await this.prisma.project.findMany({
      where: { id: { in: projectIds } },
      select: { id: true, name: true },
    });
    return Object.fromEntries(rows.map((p) => [p.id, p.name]));
  }
}
