import {
  Controller, Get, Post, Patch, Body, Param, Query, UseGuards, Req,
  HttpCode, HttpStatus, NotFoundException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '@/modules/auth/jwt-auth.guard';
import { PrismaService } from '@/prisma/prisma.service';
import { DomainActivityService } from '@/modules/domains/services/domain-activity.service';
import { Request } from 'express';

/**
 * NotificationsController
 *
 * Handles the user-facing notification inbox:
 *   - List notifications (with unread filter)
 *   - Mark as read / dismiss
 *   - Unread count (for the notification bell badge)
 *
 * Also exposes the domain activity feed endpoints.
 */
@ApiTags('notifications')
@Controller()
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class NotificationsController {
  constructor(
    private prisma: PrismaService,
    private activityService: DomainActivityService,
  ) {}

  // ── User Notification Inbox ───────────────────────────────────────────────

  /**
   * List notifications for the current user.
   * Supports filtering by unread status and project.
   */
  @Get('api/v1/notifications')
  @ApiOperation({ summary: 'List user notifications' })
  async listNotifications(
    @Req() req: Request,
    @Query('unreadOnly') unreadOnly?: string,
    @Query('projectId') projectId?: string,
    @Query('limit') limit?: string,
  ) {
    const userId = (req as any).user?.userId;
    if (!userId) throw new NotFoundException('User not found');

    const take = Math.min(parseInt(limit ?? '50', 10) || 50, 200);
    const where: any = { userId };
    if (unreadOnly === 'true') where.readAt = null;
    if (projectId) where.projectId = projectId;

    const notifications = await (this.prisma as any).userNotification.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take,
    });

    return { notifications };
  }

  /**
   * Get the unread notification count (for the bell badge).
   */
  @Get('api/v1/notifications/unread-count')
  @ApiOperation({ summary: 'Get unread notification count' })
  async getUnreadCount(@Req() req: Request) {
    const userId = (req as any).user?.userId;
    if (!userId) throw new NotFoundException('User not found');

    const count = await (this.prisma as any).userNotification.count({
      where: { userId, readAt: null, dismissedAt: null },
    });

    return { count };
  }

  /**
   * Mark a notification as read.
   */
  @Post('api/v1/notifications/:id/read')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Mark notification as read' })
  async markAsRead(@Req() req: Request, @Param('id') id: string) {
    const userId = (req as any).user?.userId;
    await (this.prisma as any).userNotification.updateMany({
      where: { id, userId },
      data: { readAt: new Date() },
    });
    return { success: true };
  }

  /**
   * Mark all notifications as read (optionally filtered by project).
   */
  @Post('api/v1/notifications/mark-all-read')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Mark all notifications as read' })
  async markAllAsRead(@Req() req: Request, @Body() body: { projectId?: string } = {}) {
    const userId = (req as any).user?.userId;
    const where: any = { userId, readAt: null };
    if (body.projectId) where.projectId = body.projectId;

    const result = await (this.prisma as any).userNotification.updateMany({
      where,
      data: { readAt: new Date() },
    });

    return { success: true, updated: result.count ?? 0 };
  }

  /**
   * Dismiss a notification (removes it from the inbox).
   */
  @Post('api/v1/notifications/:id/dismiss')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Dismiss a notification' })
  async dismiss(@Req() req: Request, @Param('id') id: string) {
    const userId = (req as any).user?.userId;
    await (this.prisma as any).userNotification.updateMany({
      where: { id, userId },
      data: { dismissedAt: new Date() },
    });
    return { success: true };
  }

  // ── Domain Activity Feed ───────────────────────────────────────────────────

  /**
   * Get the activity feed for a specific domain.
   */
  @Get('api/v1/projects/:projectId/domains/:domainId/activity')
  @ApiOperation({ summary: 'Get activity feed for a domain' })
  async getDomainActivity(
    @Param('domainId') domainId: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    return this.activityService.getDomainActivity(domainId, {
      limit: limit ? parseInt(limit, 10) : undefined,
      offset: offset ? parseInt(offset, 10) : undefined,
    });
  }

  /**
   * Get the activity feed for all domains in a project.
   */
  @Get('api/v1/projects/:projectId/domains/activity')
  @ApiOperation({ summary: 'Get activity feed for all domains in a project' })
  async getProjectDomainActivity(
    @Param('projectId') projectId: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    return this.activityService.getProjectDomainActivity(projectId, {
      limit: limit ? parseInt(limit, 10) : undefined,
      offset: offset ? parseInt(offset, 10) : undefined,
    });
  }
}
