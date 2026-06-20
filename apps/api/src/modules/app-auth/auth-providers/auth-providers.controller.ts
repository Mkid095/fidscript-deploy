import {
  Body, Controller, Delete, Get, Param, Put, Req, UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Request } from 'express';
import { JwtAuthGuard } from '@/modules/auth/jwt-auth.guard';
import { CurrentUser, AuthUser } from '@/modules/auth/current-user.decorator';
import { ProjectAccessService } from '@/modules/projects/services/project-access.service';
import { extractRequestContext } from '@/common/request-context';
import { AuthProvidersService, UpsertAuthProviderDto } from './auth-providers.service';

@ApiTags('app-auth')
@ApiBearerAuth()
@Controller('projects/:projectId/auth/providers')
@UseGuards(JwtAuthGuard)
export class AuthProvidersController {
  constructor(
    private service: AuthProvidersService,
    private projectAccess: ProjectAccessService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'List configured OAuth providers for a project (secrets masked)' })
  async list(
    @Param('projectId') projectId: string,
    @CurrentUser() user: AuthUser,
  ) {
    await this.projectAccess.findProjectWithAccess(user.userId, projectId);
    return this.service.list(projectId);
  }

  @Put(':provider')
  @ApiOperation({ summary: 'Upsert an OAuth provider (project-admin gated)' })
  async upsert(
    @Param('projectId') projectId: string,
    @Param('provider') provider: string,
    @Body() dto: UpsertAuthProviderDto,
    @CurrentUser() user: AuthUser,
    @Req() req: Request,
  ) {
    await this.projectAccess.checkPermission(user.userId, projectId, ['admin', 'owner']);
    const { ipAddress, userAgent } = extractRequestContext(req);
    return this.service.upsert(projectId, provider, dto, user.userId, ipAddress, userAgent);
  }

  @Delete(':provider')
  @ApiOperation({ summary: 'Delete an OAuth provider config (project-admin gated)' })
  async remove(
    @Param('projectId') projectId: string,
    @Param('provider') provider: string,
    @CurrentUser() user: AuthUser,
    @Req() req: Request,
  ) {
    await this.projectAccess.checkPermission(user.userId, projectId, ['admin', 'owner']);
    const { ipAddress, userAgent } = extractRequestContext(req);
    return this.service.remove(projectId, provider, user.userId, ipAddress, userAgent);
  }
}