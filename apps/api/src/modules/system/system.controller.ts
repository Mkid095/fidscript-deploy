import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

import { PlatformAdminGuard } from '@/modules/auth/guards/platform-admin.guard';
import { SystemService } from './system.service';

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
  constructor(private readonly system: SystemService) {}

  @Get('containers')
  @ApiOperation({ summary: 'The running containers, and what each of them is using' })
  async containers() {
    return this.system.state();
  }
}
