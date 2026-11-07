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
import { Public } from '@/modules/auth/decorators/public.decorator';
import { ApplicationCatalogueService } from '../services/application-catalogue.service';
import { ApplicationInstallService } from '../services/application-install.service';
import { RegistryCatalogueService } from '../services/registry-catalogue.service';

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
    private registry: RegistryCatalogueService,
  ) {}

  /**
   * The catalogue.
   *
   * It is **public**, because the setup wizard offers the applications as a
   * choice before there is an account to sign in with — and because the
   * list of what this platform is made of is not a secret.
   */
  @Get()
  @Public()
  @ApiOperation({ summary: 'Every application on this platform, and which are installed' })
  async list() {
    return { applications: await this.catalogue.list() };
  }

  /**
   * The package manager — the private npm registry the platform publishes.
   *
   * The console hides the private scopes from an anonymous visitor, so the
   * packages listed here are the public ones; the rest are one token away,
   * and this is where the token page's address comes from.
   */
  @Get('package-manager')
  @ApiOperation({ summary: 'The package manager: its console, its token page and its packages' })
  async packageManager() {
    return this.registry.catalogue();
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
  async startInstall(@Param('id') id: string) {
    return { install: this.installs.start(id) };
  }
}
