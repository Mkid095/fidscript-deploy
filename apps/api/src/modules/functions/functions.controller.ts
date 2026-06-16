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
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import { FunctionsService } from './functions.service.js';
import {
  CreateFunctionDto,
  UpdateFunctionDto,
  DeployFunctionDto,
  InvokeFunctionDto,
  GetFunctionLogsDto,
} from './dto/index.js';

@ApiTags('functions')
@Controller('projects/:projectId/functions')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class FunctionsController {
  constructor(private functionsService: FunctionsService) {}

  @Post()
  @ApiOperation({ summary: 'Create function' })
  async createFunction(@Param('projectId') projectId: string, @Body() dto: CreateFunctionDto) {
    return this.functionsService.createFunction(projectId, dto);
  }

  @Get()
  @ApiOperation({ summary: 'List functions' })
  async listFunctions(@Param('projectId') projectId: string) {
    const functions = await this.functionsService.listFunctions(projectId);
    return { functions };
  }

  @Get(':functionId')
  @ApiOperation({ summary: 'Get function' })
  async getFunction(@Param('projectId') projectId: string, @Param('functionId') functionId: string) {
    return this.functionsService.getFunction(projectId, functionId);
  }

  @Patch(':functionId')
  @ApiOperation({ summary: 'Update function' })
  async updateFunction(
    @Param('projectId') projectId: string,
    @Param('functionId') functionId: string,
    @Body() dto: UpdateFunctionDto,
  ) {
    return this.functionsService.updateFunction(projectId, functionId, dto);
  }

  @Delete(':functionId')
  @ApiOperation({ summary: 'Delete function' })
  async deleteFunction(@Param('projectId') projectId: string, @Param('functionId') functionId: string) {
    return this.functionsService.deleteFunction(projectId, functionId);
  }

  @Post(':functionId/deploy')
  @ApiOperation({ summary: 'Deploy function' })
  async deployFunction(
    @Param('projectId') projectId: string,
    @Param('functionId') functionId: string,
    @Body() dto: DeployFunctionDto,
  ) {
    return this.functionsService.deployFunction(projectId, functionId, dto);
  }

  @Post(':functionId/invoke')
  @ApiOperation({ summary: 'Invoke function' })
  async invokeFunction(
    @Param('projectId') projectId: string,
    @Param('functionId') functionId: string,
    @Body() dto: InvokeFunctionDto,
  ) {
    return this.functionsService.invokeFunction(projectId, functionId, dto);
  }

  @Get(':functionId/logs')
  @ApiOperation({ summary: 'Get function logs' })
  async getFunctionLogs(
    @Param('projectId') projectId: string,
    @Param('functionId') functionId: string,
    @Query() query: { limit?: number; cursor?: string },
  ) {
    return this.functionsService.getFunctionLogs(projectId, functionId, query.limit, query.cursor);
  }

  @Get(':functionId/versions')
  @ApiOperation({ summary: 'Get function versions' })
  async getFunctionVersions(@Param('projectId') projectId: string, @Param('functionId') functionId: string) {
    return this.functionsService.getFunctionVersions(projectId, functionId);
  }
}