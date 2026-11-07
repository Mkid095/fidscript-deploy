import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
  Req,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { Request } from 'express';
import { ApiKeyOrJwtGuard } from '@/modules/auth/guards/api-key-or-jwt.guard';
import { ScopeGuard } from '@/modules/auth/guards/scope-guard';
import { RequireScope } from '@/modules/auth/decorators/require-scope.decorator';
import { ProjectMemberGuard } from '@/modules/auth/guards/project-member.guard';
import { FunctionsService } from './functions.service';
import { FunctionsAccessService, FUNCTION_ADMIN_ROLES, FUNCTION_WRITE_ROLES } from './services/functions-access.service';
import {
  CreateFunctionDto,
  UpdateFunctionDto,
  DeployFunctionDto,
  InvokeFunctionDto,
} from './dto/index';

/**
 * The functions console — writing.
 *
 * A viewer may read the console and change nothing: no creating, no
 * editing, no deploying, no invoking. A developer may do all of that but may
 * not delete; the deletion belongs to the owner and the admin.
 */
@ApiTags('functions')
@Controller('projects/:projectId/functions')
@UseGuards(ApiKeyOrJwtGuard, ScopeGuard, ProjectMemberGuard)
@ApiBearerAuth()
export class FunctionsController {
  constructor(
    private functionsService: FunctionsService,
    private access: FunctionsAccessService,
  ) {}

  @Post()
  @RequireScope('functions:write')
  @ApiOperation({ summary: 'Create function' })
  async createFunction(
    @Param('projectId') projectId: string,
    @Body() dto: CreateFunctionDto,
    @Req() req: Request,
  ) {
    await this.access.require(req, projectId, FUNCTION_WRITE_ROLES);
    return this.functionsService.createFunction(projectId, dto);
  }

  @Patch(':functionId')
  @RequireScope('functions:write')
  @ApiOperation({ summary: 'Update function' })
  async updateFunction(
    @Param('projectId') projectId: string,
    @Param('functionId') functionId: string,
    @Body() dto: UpdateFunctionDto,
    @Req() req: Request,
  ) {
    await this.access.require(req, projectId, FUNCTION_WRITE_ROLES);
    return this.functionsService.updateFunction(projectId, functionId, dto);
  }

  @Delete(':functionId')
  @RequireScope('functions:write')
  @ApiOperation({ summary: 'Delete function' })
  async deleteFunction(
    @Param('projectId') projectId: string,
    @Param('functionId') functionId: string,
    @Req() req: Request,
  ) {
    await this.access.require(req, projectId, FUNCTION_ADMIN_ROLES);
    return this.functionsService.deleteFunction(projectId, functionId);
  }

  @Post(':functionId/deploy')
  @RequireScope('functions:write')
  @ApiOperation({ summary: 'Deploy function' })
  async deployFunction(
    @Param('projectId') projectId: string,
    @Param('functionId') functionId: string,
    @Body() dto: DeployFunctionDto,
    @Req() req: Request,
  ) {
    await this.access.require(req, projectId, FUNCTION_WRITE_ROLES);
    return this.functionsService.deployFunction(projectId, functionId, dto);
  }

  @Post(':functionId/invoke')
  @RequireScope('functions:write')
  @ApiOperation({ summary: 'Invoke function' })
  async invokeFunction(
    @Param('projectId') projectId: string,
    @Param('functionId') functionId: string,
    @Body() dto: InvokeFunctionDto,
    @Req() req: Request,
  ) {
    await this.access.require(req, projectId, FUNCTION_WRITE_ROLES);
    return this.functionsService.invokeFunction(projectId, functionId, dto);
  }
}
