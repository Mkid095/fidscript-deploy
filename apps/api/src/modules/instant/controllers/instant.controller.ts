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
    return {
      available: this.appConfig.isConfigured(),
      app: await this.instant.get(projectId),
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
