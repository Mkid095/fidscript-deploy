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
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { DeploymentsService } from './deployments.service';
import { CreateDeploymentDto, UpdateBuildConfigDto } from './dto/index';
import { Request } from 'express';

@ApiTags('deployments')
@Controller('projects/:projectId')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class DeploymentsController {
  constructor(private deploymentsService: DeploymentsService) {}

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
    return this.deploymentsService.create(user.userId, projectId, dto);
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
}