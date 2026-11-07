import { Controller, Post, Body, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Request } from 'express';
import { ApiKeyOrJwtGuard } from '@/modules/auth/guards/api-key-or-jwt.guard';
import { DeploymentDetectService } from '@/modules/deployments/services/deployment-detect.service';
import { DetectFrameworkDto } from '@/modules/deployments/dto/detect-framework.dto';

/**
 * Inspect a repository before a project exists.
 *
 * The operator picks a repository in the wizard and sees what the platform
 * made of it — the framework, the build command, the port — while they are
 * still choosing where the project lives. It is the same detection the
 * project-scoped endpoint does, without a project to scope it to.
 */
@ApiTags('deployments')
@Controller('deployments')
@UseGuards(ApiKeyOrJwtGuard)
@ApiBearerAuth()
export class DeploymentDetectController {
  constructor(private readonly detect: DeploymentDetectService) {}

  @Post('detect')
  @ApiOperation({ summary: 'Detect the framework and build plan of a github.com repository' })
  async detectRepository(@Req() req: Request, @Body() dto: DetectFrameworkDto) {
    const user = req.user as { userId: string };
    return this.detect.detectRepository(user.userId, dto);
  }
}
