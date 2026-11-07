/**
 * Email analytics + suppression list management.
 */
import {
  Controller, Get, Post, Delete, Param, Query, Body, Req,
  UseGuards, HttpCode, HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { Request } from 'express';
import { ApiKeyOrJwtGuard } from '@/modules/auth/guards/api-key-or-jwt.guard';
import { ProjectMemberGuard } from '@/modules/auth/guards/project-member.guard';
import { EmailMetricsService } from '@/modules/email/services/email-metrics.service';
import { BounceParserService } from '@/modules/email/services/bounce-parser.service';
import { PrismaService } from '@/prisma/prisma.service';

@ApiTags('email-analytics')
@Controller('projects/:projectId/email')
@UseGuards(ApiKeyOrJwtGuard, ProjectMemberGuard)
@ApiBearerAuth()
export class EmailAnalyticsController {
  constructor(
    private metrics: EmailMetricsService,
    private bounceParser: BounceParserService,
    private prisma: PrismaService,
  ) {}

  @Get('analytics/overview')
  @ApiOperation({ summary: 'Delivery overview with rates' })
  overview(@Param('projectId') projectId: string, @Query('days') days?: string) {
    return this.metrics.getOverview(projectId, days ? parseInt(days, 10) : 30);
  }

  @Get('analytics/failures')
  @ApiOperation({ summary: 'Failure breakdown by type' })
  failures(@Param('projectId') projectId: string, @Query('days') days?: string) {
    return this.metrics.getFailureBreakdown(projectId, days ? parseInt(days, 10) : 30);
  }

  @Get('analytics/latency')
  @ApiOperation({ summary: 'Delivery latency percentiles (p50/p95/p99)' })
  latency(@Param('projectId') projectId: string, @Query('days') days?: string) {
    return this.metrics.getLatencyPercentiles(projectId, days ? parseInt(days, 10) : 30);
  }

  @Get('analytics/timeline')
  @ApiOperation({ summary: 'Sends per day time-series' })
  timeline(@Param('projectId') projectId: string, @Query('days') days?: string) {
    return this.metrics.getSendTimeline(projectId, days ? parseInt(days, 10) : 30);
  }

  // ── Suppression List ─────────────────────────────────────────────

  @Get('suppressions')
  @ApiOperation({ summary: 'List suppressed recipients for this project' })
  async listSuppressions(@Param('projectId') projectId: string, @Req() req: Request) {
    this.assertAccess(req, projectId);
    const domains = await this.prisma.emailDomain.findMany({
      where: { projectId },
      select: { id: true },
    });
    return this.prisma.emailSuppression.findMany({
      where: { domainId: { in: domains.map(d => d.id) } },
      orderBy: { createdAt: 'desc' },
    });
  }

  @Post('suppressions')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Manually suppress a recipient' })
  async addSuppression(
    @Param('projectId') projectId: string,
    @Body() body: { email: string },
    @Req() req: Request,
  ) {
    this.assertAccess(req, projectId);
    await this.bounceParser.suppressRecipient(body.email, 'MANUAL');
    return { suppressed: true, email: body.email };
  }

  @Delete('suppressions/:email')
  @ApiOperation({ summary: 'Remove a recipient from the suppression list' })
  async removeSuppression(@Param('projectId') projectId: string, @Param('email') email: string, @Req() req: Request) {
    this.assertAccess(req, projectId);
    await this.prisma.emailSuppression.deleteMany({
      where: { email: email.toLowerCase() },
    });
    return { removed: true };
  }

  private assertAccess(req: Request, projectId: string) {
    const user = req.user as { isApiKey?: boolean; projectId?: string } | undefined;
    if (user?.isApiKey && user.projectId !== projectId) {
      throw new Error('API key does not have access to this project');
    }
  }
}
