import {
  Controller,
  Get,
  Post,
  Patch,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Req,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ProjectsService } from './projects.service';
import {
  CreateProjectDto,
  UpdateProjectDto,
  CloneProjectDto,
  AddMemberDto,
  UpdateEnvVarsDto,
  CreateInvitationDto,
  AcceptInvitationDto,
} from './dto/index';
import { Request } from 'express';

@ApiTags('projects')
@Controller('projects')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class ProjectsController {
  constructor(private projectsService: ProjectsService) {}

  @Get()
  @ApiOperation({ summary: 'List all projects' })
  async list(
    @Req() req: Request,
    @Query('status') status?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const user = req.user as { userId: string };
    return this.projectsService.list(user.userId, {
      status,
      page: page ? parseInt(page) : undefined,
      limit: limit ? parseInt(limit) : undefined,
    });
  }

  @Post()
  @ApiOperation({ summary: 'Create a new project' })
  @ApiResponse({ status: 201 })
  @ApiResponse({ status: 409, description: 'Project already exists' })
  async create(@Req() req: Request, @Body() dto: CreateProjectDto) {
    const user = req.user as { userId: string };
    return this.projectsService.create(user.userId, dto);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get project by ID' })
  @ApiResponse({ status: 404, description: 'Project not found' })
  async get(@Req() req: Request, @Param('id') id: string) {
    const user = req.user as { userId: string };
    return this.projectsService.get(user.userId, id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update project' })
  async update(@Req() req: Request, @Param('id') id: string, @Body() dto: UpdateProjectDto) {
    const user = req.user as { userId: string };
    return this.projectsService.update(user.userId, id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete project' })
  async delete(@Req() req: Request, @Param('id') id: string) {
    const user = req.user as { userId: string };
    return this.projectsService.delete(user.userId, id);
  }

  @Post(':id/suspend')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Suspend project' })
  async suspend(@Req() req: Request, @Param('id') id: string) {
    const user = req.user as { userId: string };
    return this.projectsService.suspend(user.userId, id);
  }

  @Post(':id/archive')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Archive project' })
  async archive(@Req() req: Request, @Param('id') id: string) {
    const user = req.user as { userId: string };
    return this.projectsService.archive(user.userId, id);
  }

  @Post(':id/restore')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Restore project' })
  async restore(@Req() req: Request, @Param('id') id: string) {
    const user = req.user as { userId: string };
    return this.projectsService.restore(user.userId, id);
  }

  @Post(':id/clone')
  @ApiOperation({ summary: 'Clone project' })
  async clone(@Req() req: Request, @Param('id') id: string, @Body() dto: CloneProjectDto) {
    const user = req.user as { userId: string };
    return this.projectsService.clone(user.userId, id, dto);
  }

  // Members
  @Get(':id/members')
  @ApiOperation({ summary: 'List project members' })
  async listMembers(@Req() req: Request, @Param('id') id: string) {
    const user = req.user as { userId: string };
    return this.projectsService.listMembers(user.userId, id);
  }

  @Post(':id/members')
  @ApiOperation({ summary: 'Add project member (by email, user must exist)' })
  async addMember(@Req() req: Request, @Param('id') id: string, @Body() dto: AddMemberDto) {
    const user = req.user as { userId: string };
    return this.projectsService.addMember(user.userId, id, dto);
  }

  @Delete(':id/members/:userId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Remove project member' })
  async removeMember(@Req() req: Request, @Param('id') id: string, @Param('userId') userId: string) {
    const currentUser = req.user as { userId: string };
    return this.projectsService.removeMember(currentUser.userId, id, userId);
  }

  // Invitations
  @Get(':id/invitations')
  @ApiOperation({ summary: 'List pending invitations' })
  async listInvitations(@Req() req: Request, @Param('id') id: string) {
    const user = req.user as { userId: string };
    return this.projectsService.listInvitations(user.userId, id);
  }

  @Post(':id/invitations')
  @ApiOperation({ summary: 'Create an invitation' })
  @ApiResponse({ status: 201, description: 'Returns the raw token (shown once)' })
  async createInvitation(@Req() req: Request, @Param('id') id: string, @Body() dto: CreateInvitationDto) {
    const user = req.user as { userId: string };
    return this.projectsService.createInvitation(user.userId, id, dto);
  }

  @Delete(':id/invitations/:invitationId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Revoke an invitation' })
  async revokeInvitation(@Req() req: Request, @Param('id') id: string, @Param('invitationId') invitationId: string) {
    const user = req.user as { userId: string };
    return this.projectsService.revokeInvitation(user.userId, id, invitationId);
  }

  // Environment variables (encrypted)
  @Get(':id/env-vars')
  @ApiOperation({ summary: 'Get environment variables (decrypted)' })
  async getEnvVars(@Req() req: Request, @Param('id') id: string) {
    const user = req.user as { userId: string };
    return this.projectsService.getEnvVars(user.userId, id);
  }

  @Put(':id/env-vars')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Set environment variables (encrypted at rest)' })
  async updateEnvVars(@Req() req: Request, @Param('id') id: string, @Body() dto: UpdateEnvVarsDto) {
    const user = req.user as { userId: string };
    return this.projectsService.updateEnvVars(user.userId, id, dto);
  }

  @Delete(':id/env-vars/:key')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete an environment variable' })
  async deleteEnvVar(@Req() req: Request, @Param('id') id: string, @Param('key') key: string) {
    const user = req.user as { userId: string };
    return this.projectsService.deleteEnvVar(user.userId, id, key);
  }

  // Project API keys
  @Get(':id/api-keys')
  @ApiOperation({ summary: 'List project API keys' })
  async listProjectApiKeys(@Req() req: Request, @Param('id') id: string) {
    const user = req.user as { userId: string };
    return this.projectsService.listProjectApiKeys(user.userId, id);
  }

  @Post(':id/api-keys')
  @ApiOperation({ summary: 'Create a project API key (key shown once)' })
  @ApiResponse({ status: 201, description: 'Returns the raw key (shown once)' })
  async createProjectApiKey(@Req() req: Request, @Param('id') id: string, @Body() dto: any) {
    const user = req.user as { userId: string };
    return this.projectsService.createProjectApiKey(user.userId, id, dto);
  }

  @Delete(':id/api-keys/:keyId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Revoke a project API key' })
  async revokeProjectApiKey(@Req() req: Request, @Param('id') id: string, @Param('keyId') keyId: string) {
    const user = req.user as { userId: string };
    return this.projectsService.revokeProjectApiKey(user.userId, id, keyId);
  }
}

// Public invitation acceptance (no auth required)
@ApiTags('invitations')
@Controller('invitations')
export class InvitationsController {
  constructor(private projectsService: ProjectsService) {}

  @Post('accept')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Accept an invitation' })
  async acceptInvitation(@Body() dto: AcceptInvitationDto) {
    return this.projectsService.acceptInvitation(dto);
  }
}
