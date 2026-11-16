import {
  Controller,
  Get,
  Post,
  Param,
  UseGuards,
  Req,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { ApiKeyOrJwtGuard } from '@/modules/auth/guards/api-key-or-jwt.guard';
import { ScopeGuard } from '@/modules/auth/guards/scope-guard';
import { RequireScope } from '@/modules/auth/decorators/require-scope.decorator';
import { ProjectMemberGuard } from '@/modules/auth/guards/project-member.guard';
import { GitIntegrationService } from '../services/git-integration.service';
import { Request } from 'express';

/**
 * A project's Git integration — the state the dashboard shows and the
 * repair it offers: re-registering a webhook GitHub lost.
 *
 * The auto-deploy switch lives on the deployments controller — the
 * project-level PATCH /projects/:projectId/auto-deploy.
 */
@ApiTags('git-integration')
@Controller('projects/:projectId/git-integration')
@UseGuards(ApiKeyOrJwtGuard, ScopeGuard, ProjectMemberGuard)
@ApiBearerAuth()
export class GitIntegrationController {
  constructor(private gitIntegration: GitIntegrationService) {}

  /**
   * GET /projects/:projectId/git-integration
   *
   * Connected account, token health, repository, branch, auto-deploy,
   * webhook registration, last commit and last successful deployment,
   * and whether the project's deployment identity exists yet.
   * Webhook status is reported as registered only when a hook id is
   * stored on the project — never assumed.
   */
  @Get()
  @RequireScope('deployments:read')
  @ApiOperation({ summary: 'Git integration status of a project' })
  status(@Req() req: Request, @Param('projectId') projectId: string) {
    const user = req.user as { userId: string };
    return this.gitIntegration.status(user.userId, projectId);
  }

  /** POST /projects/:projectId/git-integration/webhook/reconnect */
  @Post('webhook/reconnect')
  @HttpCode(HttpStatus.OK)
  @RequireScope('deployments:write')
  @ApiOperation({
    summary: 'Register the GitHub webhook again with the owner connection',
  })
  async reconnectWebhook(
    @Req() req: Request,
    @Param('projectId') projectId: string,
  ) {
    const user = req.user as { userId: string };
    return this.gitIntegration.reconnectWebhook(user.userId, projectId);
  }
}
