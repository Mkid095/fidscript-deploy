import {
  Controller, Get, Post, Put, Delete, Body, Param, UseGuards, Req, HttpCode, HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '@/modules/auth/jwt-auth.guard';
import { ProjectsService } from '@/modules/projects/services/projects.service';
import { AddMemberDto, UpdateEnvVarsDto, CreateInvitationDto } from '@/modules/projects/dto/index';
import { Request } from 'express';

@ApiTags('projects/members')
@Controller('projects')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class ProjectsMembersController {
  constructor(private projects: ProjectsService) {}

  @Get(':id/members')
  async listMembers(@Req() req: Request, @Param('id') id: string) {
    const user = req.user as { userId: string };
    return this.projects.listMembers(user.userId, id);
  }

  @Post(':id/members')
  async addMember(@Req() req: Request, @Param('id') id: string, @Body() dto: AddMemberDto) {
    const user = req.user as { userId: string };
    return this.projects.addMember(user.userId, id, dto);
  }

  @Delete(':id/members/:userId')
  @HttpCode(HttpStatus.OK)
  async removeMember(@Req() req: Request, @Param('id') id: string, @Param('userId') userId: string) {
    const currentUser = req.user as { userId: string };
    return this.projects.removeMember(currentUser.userId, id, userId);
  }

  @Get(':id/invitations')
  async listInvitations(@Req() req: Request, @Param('id') id: string) {
    const user = req.user as { userId: string };
    return this.projects.listInvitations(user.userId, id);
  }

  @Post(':id/invitations')
  async createInvitation(@Req() req: Request, @Param('id') id: string, @Body() dto: CreateInvitationDto) {
    const user = req.user as { userId: string };
    return this.projects.createInvitation(user.userId, id, dto);
  }

  @Delete(':id/invitations/:invitationId')
  @HttpCode(HttpStatus.OK)
  async revokeInvitation(@Req() req: Request, @Param('id') id: string, @Param('invitationId') invitationId: string) {
    const user = req.user as { userId: string };
    return this.projects.revokeInvitation(user.userId, id, invitationId);
  }

  @Get(':id/env-vars')
  async getEnvVars(@Req() req: Request, @Param('id') id: string) {
    const user = req.user as { userId: string };
    return this.projects.getEnvVars(user.userId, id);
  }

  @Put(':id/env-vars')
  @HttpCode(HttpStatus.OK)
  async updateEnvVars(@Req() req: Request, @Param('id') id: string, @Body() dto: UpdateEnvVarsDto) {
    const user = req.user as { userId: string };
    return this.projects.updateEnvVars(user.userId, id, dto);
  }

  @Delete(':id/env-vars/:key')
  @HttpCode(HttpStatus.OK)
  async deleteEnvVar(@Req() req: Request, @Param('id') id: string, @Param('key') key: string) {
    const user = req.user as { userId: string };
    return this.projects.deleteEnvVar(user.userId, id, key);
  }

  @Get(':id/api-keys')
  async listProjectApiKeys(@Req() req: Request, @Param('id') id: string) {
    const user = req.user as { userId: string };
    return this.projects.listProjectApiKeys(user.userId, id);
  }

  @Post(':id/api-keys')
  async createProjectApiKey(@Req() req: Request, @Param('id') id: string, @Body() dto: any) {
    const user = req.user as { userId: string };
    return this.projects.createProjectApiKey(user.userId, id, dto);
  }

  @Delete(':id/api-keys/:keyId')
  @HttpCode(HttpStatus.OK)
  async revokeProjectApiKey(@Req() req: Request, @Param('id') id: string, @Param('keyId') keyId: string) {
    const user = req.user as { userId: string };
    return this.projects.revokeProjectApiKey(user.userId, id, keyId);
  }
}
