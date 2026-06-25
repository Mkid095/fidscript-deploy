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
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '@/modules/auth/jwt-auth.guard';
import { DeploymentsService } from './deployments.service';
import { GithubWebhookService } from './services/github-webhook.service';
import { CreateDeploymentDto, UpdateBuildConfigDto } from './dto/index';
import { PrismaService } from '@/prisma/prisma.service';
import { CryptoService } from '@/modules/crypto/crypto.service';
import { Request } from 'express';

@ApiTags('deployments')
@Controller('projects/:projectId')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class DeploymentsController {
  constructor(
    private deploymentsService: DeploymentsService,
    private webhookService: GithubWebhookService,
    private prisma: PrismaService,
    private crypto: CryptoService,
  ) {}

  @Get('deployments')
  @ApiOperation({ summary: 'List deployments' })
  async list(
    @Req() req: Request,
    @Param('projectId') projectId: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const user = req.user as { userId: string };
    return this.deploymentsService.list(
      user.userId,
      projectId,
      page ? parseInt(page) : undefined,
      limit ? parseInt(limit) : undefined,
    );
  }

  @Post('deployments')
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiOperation({ summary: 'Create a new deployment (async — polls status for result)' })
  async create(
    @Req() req: Request,
    @Param('projectId') projectId: string,
    @Body() dto: CreateDeploymentDto,
  ) {
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

  @Get('deployments/:id')
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
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Stop a running deployment' })
  async stop(
    @Req() req: Request,
    @Param('projectId') projectId: string,
    @Param('id') deploymentId: string,
  ) {
    const user = req.user as { userId: string };
    return this.deploymentsService.stop(user.userId, projectId, deploymentId);
  }

  @Post('deployments/:id/restart')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Restart a stopped deployment' })
  async restart(
    @Req() req: Request,
    @Param('projectId') projectId: string,
    @Param('id') deploymentId: string,
  ) {
    const user = req.user as { userId: string };
    return this.deploymentsService.restart(user.userId, projectId, deploymentId);
  }

  @Delete('deployments/:id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Destroy a deployment (remove container, image, and record)' })
  async destroy(
    @Req() req: Request,
    @Param('projectId') projectId: string,
    @Param('id') deploymentId: string,
  ) {
    const user = req.user as { userId: string };
    return this.deploymentsService.destroy(user.userId, projectId, deploymentId);
  }

  @Post('deployments/:id/rollback')
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiOperation({ summary: 'Rollback to a previous successful deployment' })
  async rollback(
    @Req() req: Request,
    @Param('projectId') projectId: string,
    @Param('id') deploymentId: string,
  ) {
    const user = req.user as { userId: string };
    return this.deploymentsService.rollback(user.userId, projectId, deploymentId);
  }

  @Get('build-config')
  @ApiOperation({ summary: 'Get build configuration' })
  async getBuildConfig(@Req() req: Request, @Param('projectId') projectId: string) {
    const user = req.user as { userId: string };
    return this.deploymentsService.getBuildConfig(user.userId, projectId);
  }

  @Patch('build-config')
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