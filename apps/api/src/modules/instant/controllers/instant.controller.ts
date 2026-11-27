import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Request } from 'express';
import { ApiKeyOrJwtGuard } from '@/modules/auth/guards/api-key-or-jwt.guard';
import { ProjectMemberGuard } from '@/modules/auth/guards/project-member.guard';
import { InstantProvisioningService } from '../services/instant-provisioning.service';
import { InstantAppConfigService } from '../services/instant-app-config.service';

/**
 * The Instant app behind a project — the project's data plane.
 *
 * The platform's own API is the operator's console (deployments, queues,
 * domains, mail); these endpoints are the seam where an application's data
 * leaves the platform and goes to Instant, which is where its permissions
 * are enforced.
 */
@ApiTags('instant')
@Controller('projects/:projectId/instant')
@UseGuards(ApiKeyOrJwtGuard, ProjectMemberGuard)
@ApiBearerAuth()
export class InstantController {
  constructor(
    private instant: InstantProvisioningService,
    private appConfig: InstantAppConfigService,
  ) {}

  @Get()
  @ApiOperation({ summary: "The project's Instant app, and whether Instant is available" })
  async get(@Param('projectId') projectId: string) {
    const app = await this.instant.get(projectId);
    // The app the operator points at through their own env vars (their
    // existing session), and whether it has diverged from the app the
    // platform linked — the "linked a duplicate, the app uses my own" case.
    const operator = await this.instant.operatorInstantApp(projectId);
    return {
      available: this.appConfig.isConfigured(),
      dashboardUrl: this.appConfig.dashboardUrl(),
      app,
      envAppId: operator?.appId ?? null,
      mismatch: !!(operator?.appId && app && operator.appId !== app.appId),
    };
  }

  @Post()
  @ApiOperation({ summary: 'Provision an Instant app for the project' })
  async provision(
    @Req() req: Request,
    @Param('projectId') projectId: string,
    @Body() body: { title?: string },
  ) {
    const user = req.user as { userId: string };
    return this.instant.provision(projectId, user.userId, body.title);
  }

  @Post('link')
  @ApiOperation({
    summary:
      'Point the project at an Instant app that already exists (the operator\'s own session), verified with its admin token',
  })
  async link(
    @Req() req: Request,
    @Param('projectId') projectId: string,
    @Body() body: { appId: string; adminToken: string; title?: string },
  ) {
    const user = req.user as { userId: string };
    return this.instant.link(
      projectId,
      user.userId,
      body.appId,
      body.adminToken,
      body.title,
    );
  }

  @Delete()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete the Instant app and everything in it' })
  async unlink(@Req() req: Request, @Param('projectId') projectId: string) {
    const user = req.user as { userId: string };
    await this.instant.unlink(projectId, user.userId);
    return { deleted: true };
  }

  @Get('config')
  @ApiOperation({ summary: 'The configuration a deployed application needs to reach its data plane' })
  async config(@Param('projectId') projectId: string) {
    return this.appConfig.forProject(projectId);
  }
}
