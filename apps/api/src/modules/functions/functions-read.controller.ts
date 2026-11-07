import { Controller, Get, Param, Query, UseGuards, Req } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { Request } from 'express';
import { ApiKeyOrJwtGuard } from '@/modules/auth/guards/api-key-or-jwt.guard';
import { ScopeGuard } from '@/modules/auth/guards/scope-guard';
import { RequireScope } from '@/modules/auth/decorators/require-scope.decorator';
import { ProjectMemberGuard } from '@/modules/auth/guards/project-member.guard';
import { FunctionsService } from './functions.service';
import { FunctionsAccessService } from './services/functions-access.service';

/**
 * The functions console — reading.
 *
 * Every member of the project may read; only the variables (the
 * credentials the function calls with) are restricted to the people who
 * administer it.
 */
@ApiTags('functions')
@Controller('projects/:projectId/functions')
@UseGuards(ApiKeyOrJwtGuard, ScopeGuard, ProjectMemberGuard)
@ApiBearerAuth()
export class FunctionsReadController {
  constructor(
    private functionsService: FunctionsService,
    private access: FunctionsAccessService,
  ) {}

  @Get()
  @RequireScope('functions:read')
  @ApiOperation({ summary: 'List functions' })
  async listFunctions(@Param('projectId') projectId: string, @Req() req: Request) {
    // The function's variables are secrets. Only the people who administer
    // the project may read them; everyone else sees them masked.
    const canSeeSecrets = await this.access.canSeeSecrets(req, projectId);
    const functions = await this.functionsService.listFunctions(projectId, canSeeSecrets);
    return { functions };
  }

  @Get(':functionId')
  @RequireScope('functions:read')
  @ApiOperation({ summary: 'Get function' })
  async getFunction(
    @Param('projectId') projectId: string,
    @Param('functionId') functionId: string,
    @Req() req: Request,
  ) {
    const canSeeSecrets = await this.access.canSeeSecrets(req, projectId);
    return this.functionsService.getFunction(projectId, functionId, canSeeSecrets);
  }

  @Get(':functionId/logs')
  @RequireScope('functions:read')
  @ApiOperation({ summary: 'Get function logs' })
  async getFunctionLogs(
    @Param('projectId') projectId: string,
    @Param('functionId') functionId: string,
    @Query() query: { limit?: number; cursor?: string },
  ) {
    return this.functionsService.getFunctionLogs(projectId, functionId, query.limit, query.cursor);
  }

  @Get(':functionId/versions')
  @RequireScope('functions:read')
  @ApiOperation({ summary: 'Get function versions' })
  async getFunctionVersions(@Param('projectId') projectId: string, @Param('functionId') functionId: string) {
    return this.functionsService.getFunctionVersions(projectId, functionId);
  }

  @Get(':functionId/code')
  @RequireScope('functions:read')
  @ApiOperation({ summary: 'Get function code (optionally at a specific version)' })
  async getFunctionCode(
    @Param('projectId') projectId: string,
    @Param('functionId') functionId: string,
    @Query() query: { version?: string },
  ) {
    return this.functionsService.getFunctionCode(projectId, functionId, query.version);
  }
}
