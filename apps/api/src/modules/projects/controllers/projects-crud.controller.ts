import {
  Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards, Req, HttpCode, HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { ApiKeyOrJwtGuard } from '@/modules/auth/guards/api-key-or-jwt.guard';
import { ProjectsService } from '@/modules/projects/services/projects.service';
import { CreateProjectDto, UpdateProjectDto, CloneProjectDto } from '@/modules/projects/dto/index';
import { Request } from 'express';

interface AuthUser {
  userId: string;
  isApiKey?: boolean;
  projectId?: string;
}

@ApiTags('projects')
@Controller('projects')
@ApiBearerAuth()
export class ProjectsCrudController {
  constructor(private projects: ProjectsService) {}

  @Get()
  @UseGuards(ApiKeyOrJwtGuard)
  async list(@Req() req: Request, @Query('status') status?: string, @Query('page') page?: string, @Query('limit') limit?: string) {
    const user = req.user as AuthUser;
    if (user.isApiKey && user.projectId) {
      const project = await this.projects.get(user.userId, user.projectId);
      return { projects: [project], pagination: { page: 1, limit: 1, total: 1, pages: 1 } };
    }
    return this.projects.list(user.userId, { status, page: page ? parseInt(page) : undefined, limit: limit ? parseInt(limit) : undefined });
  }

  /** No auth — returns raw headers for debugging X-API-Key passthrough */
  @Get('raw-headers')
  async rawHeaders(@Req() req: Request) {
    return {
      allHeaders: req.headers,
      xApiKey: req.headers['x-api-key'],
      authorization: req.headers.authorization,
    };
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @UseGuards(ApiKeyOrJwtGuard)
  async create(@Req() req: Request, @Body() dto: CreateProjectDto) {
    const user = req.user as AuthUser;
    return this.projects.create(user.userId, dto);
  }

  @Get(':id')
  @UseGuards(ApiKeyOrJwtGuard)
  async get(@Req() req: Request, @Param('id') id: string) {
    const user = req.user as AuthUser;
    return this.projects.get(user.userId, id);
  }

  @Patch(':id')
  @UseGuards(ApiKeyOrJwtGuard)
  async update(@Req() req: Request, @Param('id') id: string, @Body() dto: UpdateProjectDto) {
    const user = req.user as AuthUser;
    return this.projects.update(user.userId, id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @UseGuards(ApiKeyOrJwtGuard)
  async delete(@Req() req: Request, @Param('id') id: string) {
    const user = req.user as AuthUser;
    return this.projects.delete(user.userId, id);
  }

  @Post(':id/request-purge')
  @HttpCode(HttpStatus.OK)
  @UseGuards(ApiKeyOrJwtGuard)
  async requestPurge(@Req() req: Request, @Param('id') id: string) {
    const user = req.user as AuthUser;
    return this.projects.requestPurgeVerification(user.userId, id);
  }

  @Post(':id/purge')
  @HttpCode(HttpStatus.OK)
  @UseGuards(ApiKeyOrJwtGuard)
  async purge(@Req() req: Request, @Param('id') id: string, @Body() body: { code: string }) {
    const user = req.user as AuthUser;
    return this.projects.purge(user.userId, id, body.code);
  }

  @Post(':id/suspend')
  @HttpCode(HttpStatus.OK)
  @UseGuards(ApiKeyOrJwtGuard)
  async suspend(@Req() req: Request, @Param('id') id: string) {
    const user = req.user as AuthUser;
    return this.projects.suspend(user.userId, id);
  }

  @Post(':id/archive')
  @HttpCode(HttpStatus.OK)
  @UseGuards(ApiKeyOrJwtGuard)
  async archive(@Req() req: Request, @Param('id') id: string) {
    const user = req.user as AuthUser;
    return this.projects.archive(user.userId, id);
  }

  @Post(':id/restore')
  @HttpCode(HttpStatus.OK)
  @UseGuards(ApiKeyOrJwtGuard)
  async restore(@Req() req: Request, @Param('id') id: string) {
    const user = req.user as AuthUser;
    return this.projects.restore(user.userId, id);
  }

  @Post(':id/clone')
  @UseGuards(ApiKeyOrJwtGuard)
  async clone(@Req() req: Request, @Param('id') id: string, @Body() dto: CloneProjectDto) {
    const user = req.user as AuthUser;
    return this.projects.clone(user.userId, id, dto);
  }

  @Get(':id/events')
  @UseGuards(ApiKeyOrJwtGuard)
  async getProjectEvents(@Req() req: Request, @Param('id') id: string, @Query('limit') limit?: string) {
    const user = req.user as AuthUser;
    return this.projects.getProjectEvents(user.userId, id, limit ? parseInt(limit) : 20);
  }
}
