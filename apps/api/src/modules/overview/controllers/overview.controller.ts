import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { Request } from 'express';
import { ApiKeyOrJwtGuard } from '@/modules/auth/guards/api-key-or-jwt.guard';
import { OverviewService } from '@/modules/overview/services/overview.service';

/**
 * The platform overview.
 *
 * What is happening across the projects the caller can reach: their
 * projects, their deployments, their alerts and their recent activity.
 *
 * It is **their** view, not the platform's. Nothing here counts over the
 * platform as a whole, so it never answers a question about another
 * tenant's work or about the infrastructure.
 */
@ApiTags('overview')
@Controller('overview')
@UseGuards(ApiKeyOrJwtGuard)
@ApiBearerAuth()
export class OverviewController {
  constructor(private overview: OverviewService) {}

  @Get()
  @ApiOperation({ summary: "The caller's projects, deployments, alerts and activity" })
  async get(@Req() req: Request) {
    const user = req.user as { userId: string };
    return this.overview.overview(user.userId);
  }
}
