import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Req,
  HttpCode,
  HttpStatus,
  HttpException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '@/modules/auth/jwt-auth.guard';
import { ApiKeyOrJwtGuard } from '@/modules/auth/guards/api-key-or-jwt.guard';
import { ScopeGuard } from '@/modules/auth/guards/scope-guard';
import { RequireScope } from '@/modules/auth/decorators/require-scope.decorator';
import { ProjectMemberGuard } from '@/modules/auth/guards/project-member.guard';
import { DeploymentsService } from './deployments.service';
import { GithubWebhookService } from './services/github-webhook.service';
import { CreateDeploymentDto, UpdateBuildConfigDto, DetectFrameworkDto } from './dto/index';
import { PrismaService } from '@/prisma/prisma.service';
import { CryptoService } from '@/modules/crypto/crypto.service';
import { AuthRateLimiter } from '@/common/auth-rate-limiter.service';
import { Request } from 'express';

/**
 * How often one project's deployments may be made to move, per hour.
 *
 * The auth and scope guards decide WHO may trigger; this decides HOW FAST.
 * A build takes minutes, so a legitimate operator is never caught by it —
 * what it catches is the loop: a script that retries on a failure, a CI
 * pipeline that fires on every comment, a leaked key being probed.
 */
const DEPLOY_TRIGGER_LIMIT = 30;
const DEPLOY_TRIGGER_WINDOW_SEC = 3600;

@ApiTags('deployments')
@Controller('projects/:projectId')
@UseGuards(ApiKeyOrJwtGuard, ScopeGuard, ProjectMemberGuard)
@ApiBearerAuth()
export class DeploymentsController {
  constructor(
    private deploymentsService: DeploymentsService,
    private webhookService: GithubWebhookService,
    private prisma: PrismaService,
    private crypto: CryptoService,
    private rateLimiter: AuthRateLimiter,
  ) {}

  /**
   * The trigger bucket, per project: every mutating route consumes from it
   * before it does its work, and a full bucket answers 429 — the caller
   * slows down, the project's build lane stays theirs. The body carries
   * `retryAfter` (for the console) and the `Retry-After` header is set too,
   * so a CLI or a script that reads only the header gets it as well.
   */
  private async guardTrigger(req: Request, projectId: string): Promise<void> {
    const result = await this.rateLimiter.consume(
      `rl:deploy:${projectId}`,
      DEPLOY_TRIGGER_LIMIT,
      DEPLOY_TRIGGER_WINDOW_SEC,
    );
    if (!result.allowed) {
      req.res?.setHeader('Retry-After', String(result.retryAfter));
      throw new HttpException(
        {
          message: 'Too many deployment actions for this project right now.',
          retryAfter: result.retryAfter,
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
  }

  @Get('deployments')
  @RequireScope('deployments:read')
  @ApiOperation({ summary: 'List deployments' })
  async list(
    @Req() req: Request,
    @Param('projectId') projectId: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('status') status?: string,
  ) {
    const user = req.user as { userId: string };
    return this.deploymentsService.list(
      user.userId,
      projectId,
      page ? parseInt(page) : undefined,
      limit ? parseInt(limit) : undefined,
      status,
    );
  }

  @Post('deployments')
  @RequireScope('deployments:write')
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiOperation({ summary: 'Create a new deployment (async — polls status for result)' })
  async create(
    @Req() req: Request,
    @Param('projectId') projectId: string,
    @Body() dto: CreateDeploymentDto,
  ) {
    await this.guardTrigger(req, projectId);
    const user = req.user as { userId: string };
    const result = await this.deploymentsService.create(user.userId, projectId, dto);

    // Register a push-to-deploy webhook on the GitHub repo (idempotent).
    // Best-effort — a failure here doesn't block the deployment.
    if (dto.source?.type === 'git' && dto.source.git?.url && dto.source.git.url.includes('github.com')) {
      this.registerWebhookAsync(user.userId, projectId, dto.source.git.url).catch(() => {});
    }

    return result;
  }

  /**
   * Register a GitHub webhook for push-to-deploy. Fetches the user's GitHub
   * token from their encrypted connection, extracts owner/repo from the URL,
   * and calls the webhook service.
   */
  private async registerWebhookAsync(userId: string, projectId: string, gitUrl: string) {
    const match = gitUrl.match(/github\.com[/:]([^/]+\/[^/.]+)/);
    if (!match) return;
    const repoFullName = match[1];

    const conn = await this.prisma.$queryRaw<{ encrypted_token: string }[]>`
      SELECT encrypted_token FROM identity.github_connections WHERE user_id = ${userId} LIMIT 1
    `.then(rows => rows[0]);
    if (!conn?.encrypted_token) return;

    let token: string;
    try { token = this.crypto.decrypt(conn.encrypted_token); } catch { return; }

    await this.webhookService.registerWebhook(projectId, repoFullName, token);
  }

  @Post('deployments/detect')
  @RequireScope('deployments:read')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Detect framework and build plan for a repository (no deploy)' })
  async detect(
    @Req() req: Request,
    @Param('projectId') projectId: string,
    @Body() dto: DetectFrameworkDto,
  ) {
    const user = req.user as { userId: string };
    return this.deploymentsService.detectFramework(user.userId, projectId, dto);
  }

  @Get('deployments/subdomain-available')
  @RequireScope('deployments:read')
  @ApiOperation({ summary: 'Whether a subdomain of the platform app zone is free' })
  async subdomainAvailable(
    @Req() req: Request,
    @Param('projectId') projectId: string,
    @Query('sub') sub: string,
  ) {
    const user = req.user as { userId: string };
    return this.deploymentsService.checkSubdomain(user.userId, projectId, sub ?? '');
  }

  @Get('deployments/:id')
  @RequireScope('deployments:read')
  @ApiOperation({ summary: 'Get deployment details' })
  async get(
    @Req() req: Request,
    @Param('projectId') projectId: string,
    @Param('id') deploymentId: string,
  ) {
    const user = req.user as { userId: string };
    return this.deploymentsService.get(user.userId, projectId, deploymentId);
  }

  @Get('deployments/:id/logs')
  @RequireScope('deployments:read')
  @ApiOperation({ summary: 'Get deployment build logs' })
  async getLogs(
    @Req() req: Request,
    @Param('projectId') projectId: string,
    @Param('id') deploymentId: string,
  ) {
    const user = req.user as { userId: string };
    return this.deploymentsService.getLogs(user.userId, projectId, deploymentId);
  }

  @Post('deployments/:id/stop')
  @RequireScope('deployments:write')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Stop a running deployment' })
  async stop(
    @Req() req: Request,
    @Param('projectId') projectId: string,
    @Param('id') deploymentId: string,
  ) {
    await this.guardTrigger(req, projectId);
    const user = req.user as { userId: string };
    return this.deploymentsService.stop(user.userId, projectId, deploymentId);
  }

  @Post('deployments/:id/restart')
  @RequireScope('deployments:write')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Restart a stopped deployment' })
  async restart(
    @Req() req: Request,
    @Param('projectId') projectId: string,
    @Param('id') deploymentId: string,
  ) {
    await this.guardTrigger(req, projectId);
    const user = req.user as { userId: string };
    return this.deploymentsService.restart(user.userId, projectId, deploymentId);
  }

  @Delete('deployments/:id')
  @RequireScope('deployments:delete')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Destroy a deployment (remove container, image, and record)' })
  async destroy(
    @Req() req: Request,
    @Param('projectId') projectId: string,
    @Param('id') deploymentId: string,
  ) {
    await this.guardTrigger(req, projectId);
    const user = req.user as { userId: string };
    return this.deploymentsService.destroy(user.userId, projectId, deploymentId);
  }

  @Post('deployments/:id/rollback')
  @RequireScope('deployments:write')
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiOperation({ summary: 'Rollback to a previous successful deployment' })
  async rollback(
    @Req() req: Request,
    @Param('projectId') projectId: string,
    @Param('id') deploymentId: string,
    @Body() body: { targetDeploymentId?: string } | undefined,
  ) {
    await this.guardTrigger(req, projectId);
    const user = req.user as { userId: string };
    return this.deploymentsService.rollback(user.userId, projectId, deploymentId, body?.targetDeploymentId);
  }

  @Post('deployments/apply-build-config')
  @RequireScope('deployments:write')
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiOperation({
    summary:
      'Re-run the live container under the project\'s current build settings (applies resource ceilings now, without a new version)',
  })
  async applyBuildConfig(
    @Req() req: Request,
    @Param('projectId') projectId: string,
  ) {
    await this.guardTrigger(req, projectId);
    const user = req.user as { userId: string };
    return this.deploymentsService.applyBuildConfig(user.userId, projectId);
  }

  @Get('build-config')
  @RequireScope('deployments:read')
  @ApiOperation({ summary: 'Get build configuration' })
  async getBuildConfig(@Req() req: Request, @Param('projectId') projectId: string) {
    const user = req.user as { userId: string };
    return this.deploymentsService.getBuildConfig(user.userId, projectId);
  }

  @Patch('build-config')
  @RequireScope('deployments:write')
  @ApiOperation({ summary: 'Update build configuration' })
  async updateBuildConfig(
    @Req() req: Request,
    @Param('projectId') projectId: string,
    @Body() dto: UpdateBuildConfigDto,
  ) {
    const user = req.user as { userId: string };
    return this.deploymentsService.updateBuildConfig(user.userId, projectId, dto);
  }

  /**
   * Toggle push-to-deploy (auto-deploy) for a project. When enabled, pushes
   * to the project's source branch trigger a new deployment via the GitHub
   * webhook receiver.
   */
  @Patch('auto-deploy')
  @RequireScope('deployments:write')
  @ApiOperation({ summary: 'Toggle auto-deploy on push' })
  async toggleAutoDeploy(
    @Req() req: Request,
    @Param('projectId') projectId: string,
    @Body() body: { enabled: boolean },
  ) {
    const user = req.user as { userId: string };
    await this.deploymentsService.getBuildConfig(user.userId, projectId); // access check
    await this.prisma.project.update({
      where: { id: projectId },
      data: { autoDeploy: body.enabled },
    });
    return { autoDeploy: body.enabled };
  }
}