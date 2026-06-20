import {
  Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards, Req, HttpCode, HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '@/modules/auth/jwt-auth.guard';
import { ProjectsService } from '@/modules/projects/services/projects.service';
import { CreateProjectDto, UpdateProjectDto, CloneProjectDto } from '@/modules/projects/dto/index';
import { Request } from 'express';

@ApiTags('projects')
@Controller('projects')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class ProjectsCrudController {
  constructor(private projects: ProjectsService) {}

  @Get()
  async list(@Req() req: Request, @Query('status') status?: string, @Query('page') page?: string, @Query('limit') limit?: string) {
    const user = req.user as { userId: string };
    return this.projects.list(user.userId, { status, page: page ? parseInt(page) : undefined, limit: limit ? parseInt(limit) : undefined });
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(@Req() req: Request, @Body() dto: CreateProjectDto) {
    const user = req.user as { userId: string };
    return this.projects.create(user.userId, dto);
  }

  @Get(':id')
  async get(@Req() req: Request, @Param('id') id: string) {
    const user = req.user as { userId: string };
    return this.projects.get(user.userId, id);
  }

  @Patch(':id')
  async update(@Req() req: Request, @Param('id') id: string, @Body() dto: UpdateProjectDto) {
    const user = req.user as { userId: string };
    return this.projects.update(user.userId, id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  async delete(@Req() req: Request, @Param('id') id: string) {
    const user = req.user as { userId: string };
    return this.projects.delete(user.userId, id);
  }

  @Post(':id/suspend')
  @HttpCode(HttpStatus.OK)
  async suspend(@Req() req: Request, @Param('id') id: string) {
    const user = req.user as { userId: string };
    return this.projects.suspend(user.userId, id);
  }

  @Post(':id/archive')
  @HttpCode(HttpStatus.OK)
  async archive(@Req() req: Request, @Param('id') id: string) {
    const user = req.user as { userId: string };
    return this.projects.archive(user.userId, id);
  }

  @Post(':id/restore')
  @HttpCode(HttpStatus.OK)
  async restore(@Req() req: Request, @Param('id') id: string) {
    const user = req.user as { userId: string };
    return this.projects.restore(user.userId, id);
  }

  @Post(':id/clone')
  async clone(@Req() req: Request, @Param('id') id: string, @Body() dto: CloneProjectDto) {
    const user = req.user as { userId: string };
    return this.projects.clone(user.userId, id, dto);
  }

  /** Activity feed: last N platform events for this project (PREREQ-PROJ-3). */
  @Get(':id/events')
  async getProjectEvents(@Req() req: Request, @Param('id') id: string, @Query('limit') limit?: string) {
    const user = req.user as { userId: string };
    return this.projects.getProjectEvents(user.userId, id, limit ? parseInt(limit) : 20);
  }
}
