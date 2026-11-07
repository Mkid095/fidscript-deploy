import {
  Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards, Req, HttpCode, HttpStatus,
  ForbiddenException,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { ApiKeyOrJwtGuard } from '@/modules/auth/guards/api-key-or-jwt.guard';
import { ScopeGuard } from '@/modules/auth/guards/scope-guard';
import { ProjectMemberGuard } from '@/modules/auth/guards/project-member.guard';
import { RequireScope } from '@/modules/auth/decorators/require-scope.decorator';
import { ProjectsService } from '@/modules/projects/services/projects.service';
import { CreateProjectDto, UpdateProjectDto, CloneProjectDto } from '@/modules/projects/dto/index';
import { Request } from 'express';

interface AuthUser {
  userId: string;
  isApiKey?: boolean;
  keyType?: 'account' | 'project';
  projectId?: string;
}

@ApiTags('projects')
@Controller('projects')
@ApiBearerAuth()
export class ProjectsCrudController {
  constructor(private projects: ProjectsService) {}

  @Get()
  @UseGuards(ApiKeyOrJwtGuard, ScopeGuard)
  @RequireScope('projects:read')
  async list(@Req() req: Request, @Query('status') status?: string, @Query('page') page?: string, @Query('limit') limit?: string) {
    const user = req.user as AuthUser;
    if (user.isApiKey && user.projectId) {
      // A project key sees exactly one project: its own.
      const project = await this.projects.get(user.userId, user.projectId, user.projectId);
      return { projects: [project], pagination: { page: 1, limit: 1, total: 1, pages: 1 } };
    }
    return this.projects.list(user.userId, { status, page: page ? parseInt(page) : undefined, limit: limit ? parseInt(limit) : undefined });
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @UseGuards(ApiKeyOrJwtGuard, ScopeGuard)
  @RequireScope('projects:write')
  async create(@Req() req: Request, @Body() dto: CreateProjectDto) {
    const user = req.user as AuthUser;
    // A key cannot own a project: the owner is a person.
    if (user.isApiKey) {
      throw new ForbiddenException('An API key cannot create a project');
    }
    return this.projects.create(user.userId, dto);
  }

  @Get(':id')
  @UseGuards(ApiKeyOrJwtGuard, ScopeGuard, ProjectMemberGuard)
  @RequireScope('projects:read')
  async get(@Req() req: Request, @Param('id') id: string) {
    const user = req.user as AuthUser;
    return this.projects.get(user.userId, id, user.projectId);
  }

  @Patch(':id')
  @UseGuards(ApiKeyOrJwtGuard, ScopeGuard, ProjectMemberGuard)
  @RequireScope('projects:write')
  async update(@Req() req: Request, @Param('id') id: string, @Body() dto: UpdateProjectDto) {
    const user = req.user as AuthUser;
    return this.projects.update(user.userId, id, dto, user.projectId);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @UseGuards(ApiKeyOrJwtGuard, ScopeGuard, ProjectMemberGuard)
  @RequireScope('projects:delete')
  async delete(@Req() req: Request, @Param('id') id: string) {
    const user = req.user as AuthUser;
    return this.projects.delete(user.userId, id, user.projectId);
  }

  @Post(':id/request-purge')
  @HttpCode(HttpStatus.OK)
  @UseGuards(ApiKeyOrJwtGuard, ScopeGuard, ProjectMemberGuard)
  async requestPurge(@Req() req: Request, @Param('id') id: string) {
    const user = req.user as AuthUser;
    return this.projects.requestPurgeVerification(user.userId, id, user.projectId);
  }

  @Post(':id/purge')
  @HttpCode(HttpStatus.OK)
  @UseGuards(ApiKeyOrJwtGuard, ScopeGuard, ProjectMemberGuard)
  async purge(@Req() req: Request, @Param('id') id: string, @Body() body: { code: string }) {
    const user = req.user as AuthUser;
    return this.projects.purge(user.userId, id, body.code, user.projectId);
  }

  @Post(':id/suspend')
  @HttpCode(HttpStatus.OK)
  @UseGuards(ApiKeyOrJwtGuard, ScopeGuard, ProjectMemberGuard)
  async suspend(@Req() req: Request, @Param('id') id: string) {
    const user = req.user as AuthUser;
    return this.projects.suspend(user.userId, id, user.projectId);
  }

  @Post(':id/archive')
  @HttpCode(HttpStatus.OK)
  @UseGuards(ApiKeyOrJwtGuard, ScopeGuard, ProjectMemberGuard)
  async archive(@Req() req: Request, @Param('id') id: string) {
    const user = req.user as AuthUser;
    return this.projects.archive(user.userId, id, user.projectId);
  }

  @Post(':id/restore')
  @HttpCode(HttpStatus.OK)
  @UseGuards(ApiKeyOrJwtGuard, ScopeGuard, ProjectMemberGuard)
  async restore(@Req() req: Request, @Param('id') id: string) {
    const user = req.user as AuthUser;
    return this.projects.restore(user.userId, id, user.projectId);
  }

  @Post(':id/clone')
  @UseGuards(ApiKeyOrJwtGuard, ScopeGuard, ProjectMemberGuard)
  @RequireScope('projects:write')
  async clone(@Req() req: Request, @Param('id') id: string, @Body() dto: CloneProjectDto) {
    const user = req.user as AuthUser;
    return this.projects.clone(user.userId, id, dto, user.projectId);
  }

  @Get(':id/events')
  @UseGuards(ApiKeyOrJwtGuard, ScopeGuard, ProjectMemberGuard)
  async getProjectEvents(@Req() req: Request, @Param('id') id: string, @Query('limit') limit?: string) {
    const user = req.user as AuthUser;
    return this.projects.getProjectEvents(user.userId, id, limit ? parseInt(limit) : 20, user.projectId);
  }
}
