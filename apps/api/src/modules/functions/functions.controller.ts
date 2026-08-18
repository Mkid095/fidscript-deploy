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
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { ApiKeyOrJwtGuard } from '@/modules/auth/guards/api-key-or-jwt.guard';
import { ScopeGuard } from '@/modules/auth/guards/scope-guard';
import { RequireScope } from '@/modules/auth/decorators/require-scope.decorator';
import { ProjectMemberGuard } from '@/modules/auth/guards/project-member.guard';
import { FunctionsService } from './functions.service';
import {
  CreateFunctionDto,
  UpdateFunctionDto,
  DeployFunctionDto,
  InvokeFunctionDto,
  GetFunctionLogsDto,
} from './dto/index';

@ApiTags('functions')
@Controller('projects/:projectId/functions')
@UseGuards(ApiKeyOrJwtGuard, ScopeGuard, ProjectMemberGuard)
@ApiBearerAuth()
export class FunctionsController {
  constructor(private functionsService: FunctionsService) {}

  @Post()
  @RequireScope('functions:write')
  @ApiOperation({ summary: 'Create function' })
  async createFunction(@Param('projectId') projectId: string, @Body() dto: CreateFunctionDto) {
    return this.functionsService.createFunction(projectId, dto);
  }

  @Get()
  @RequireScope('functions:read')
  @ApiOperation({ summary: 'List functions' })
  async listFunctions(@Param('projectId') projectId: string) {
    const functions = await this.functionsService.listFunctions(projectId);
    return { functions };
  }

  @Get(':functionId')
  @RequireScope('functions:read')
  @ApiOperation({ summary: 'Get function' })
  async getFunction(@Param('projectId') projectId: string, @Param('functionId') functionId: string) {
    return this.functionsService.getFunction(projectId, functionId);
  }

  @Patch(':functionId')
  @RequireScope('functions:write')
  @ApiOperation({ summary: 'Update function' })
  async updateFunction(
    @Param('projectId') projectId: string,
    @Param('functionId') functionId: string,
    @Body() dto: UpdateFunctionDto,
  ) {
    return this.functionsService.updateFunction(projectId, functionId, dto);
  }

  @Delete(':functionId')
  @RequireScope('functions:write')
  @ApiOperation({ summary: 'Delete function' })
  async deleteFunction(@Param('projectId') projectId: string, @Param('functionId') functionId: string) {
    return this.functionsService.deleteFunction(projectId, functionId);
  }

  @Post(':functionId/deploy')
  @RequireScope('functions:write')
  @ApiOperation({ summary: 'Deploy function' })
  async deployFunction(
    @Param('projectId') projectId: string,
    @Param('functionId') functionId: string,
    @Body() dto: DeployFunctionDto,
  ) {
    return this.functionsService.deployFunction(projectId, functionId, dto);
  }

  @Post(':functionId/invoke')
  @RequireScope('functions:write')
  @ApiOperation({ summary: 'Invoke function' })
  async invokeFunction(
    @Param('projectId') projectId: string,
    @Param('functionId') functionId: string,
    @Body() dto: InvokeFunctionDto,
  ) {
    return this.functionsService.invokeFunction(projectId, functionId, dto);
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