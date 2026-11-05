import {
  Controller,
  Get,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ApiKeyOrJwtGuard } from '@/modules/auth/guards/api-key-or-jwt.guard';
import { PlatformAdminGuard, ROLES_KEY } from '@/modules/auth/guards/platform-admin.guard';
import { SetMetadata } from '@nestjs/common';
import { ApplicationCatalogueService } from '../services/application-catalogue.service';
import { ApplicationInstallService } from '../services/application-install.service';

/**
 * The applications on this platform.
 *
 * The catalogue is what an operator sees when they arrive: the deployment
 * engine and the mail server are already there, and the rest are installed
 * from this screen.
 */
@ApiTags('applications')
@Controller('applications')
@UseGuards(ApiKeyOrJwtGuard)
@ApiBearerAuth()
export class ApplicationsController {
  constructor(
    private catalogue: ApplicationCatalogueService,
    private installs: ApplicationInstallService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Every application on this platform, and which are installed' })
  list() {
    return { applications: this.catalogue.list() };
  }

  @Get('installs')
  @ApiOperation({ summary: 'The installs currently running, and the ones that just finished' })
  listInstalls() {
    return { installs: this.installs.list() };
  }

  @Get(':id/install')
  @ApiOperation({ summary: 'The most recent install of an application' })
  install(@Param('id') id: string) {
    return { install: this.installs.get(id) };
  }

  @Post(':id/install')
  @UseGuards(PlatformAdminGuard)
  @SetMetadata(ROLES_KEY, ['ADMIN', 'OWNER'])
  @ApiOperation({ summary: 'Install an application in the background' })
  startInstall(@Param('id') id: string) {
    return { install: this.installs.start(id) };
  }
}
