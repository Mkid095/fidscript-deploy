import { Controller, Get, Post, Param, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

import { PlatformAdminGuard } from '@/modules/auth/guards/platform-admin.guard';
import { SystemService } from './system.service';
import { DockerSpaceService } from './docker-space.service';

/**
 * The machine.
 *
 * What the platform is running and what each of it is using. It is the
 * operator's own view of their own server.
 */
@ApiTags('system')
@Controller('system')
@UseGuards(PlatformAdminGuard)
@ApiBearerAuth()
export class SystemController {
  constructor(
    private readonly system: SystemService,
    private readonly space: DockerSpaceService,
  ) {}

  @Get('traffic')
  @ApiOperation({ summary: 'The requests each site carried' })
  async traffic() {
    return { sites: await this.system.traffic() };
  }

  @Get('containers')
  @ApiOperation({ summary: 'The running containers, and what each of them is using' })
  async containers() {
    return this.system.state();
  }

  @Get('deletion-tasks')
  @ApiOperation({
    summary: 'The deletion cleanups that have not finished — failed, or stuck mid-run',
  })
  async deletionTasks() {
    return { tasks: await this.system.deletionTasks() };
  }

  @Post('deletion-tasks/:projectId/retry')
  @ApiOperation({
    summary: 'Retry a failed deletion cleanup. Idempotent: the finished steps are not redone.',
  })
  async retryDeletionTask(@Param('projectId') projectId: string) {
    await this.system.retryDeletion(projectId);
    return { success: true };
  }

  @Get('space')
  @ApiOperation({
    summary:
      'Where the machine’s disk goes: the root filesystem, and what the Docker daemon reports per category — including what it honestly calls reclaimable.',
  })
  async spaceReport() {
    return this.space.report();
  }

  @Post('space/reclaim')
  @ApiOperation({
    summary:
      'Reclaim what is actually reclaimable — dangling images, stopped containers, unused networks, and build cache nothing references. Volumes, tagged images and running containers are never touched.',
  })
  async spaceReclaim() {
    return this.space.reclaim();
  }
}
