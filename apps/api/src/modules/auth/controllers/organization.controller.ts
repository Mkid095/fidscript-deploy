import {
  Controller, Get, Post, Patch, Delete, Body, Param,
  Req, UseGuards, HttpCode, HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { Request } from 'express';
import { OrganizationService } from '@/modules/auth/services/organization.service';
import { TeamService } from '@/modules/auth/services/team.service';
import { JwtAuthGuard } from '@/modules/auth/jwt-auth.guard';
import { CurrentUser } from '@/modules/auth/current-user.decorator';
import { extractRequestContext } from '@/common/request-context';
import {
  CreateOrganizationDto, UpdateOrganizationDto,
  CreateRoleDto, UpdateRoleDto,
  InviteMemberDto, UpdateMemberRoleDto,
  CreateTeamDto, UpdateTeamDto, AddTeamMemberDto, UpdateTeamMemberRoleDto,
  AcceptInvitationDto,
} from '@/modules/auth/dto/organization.dto';

@ApiTags('organizations')
@Controller('organizations')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class OrganizationController {
  constructor(
    private orgs: OrganizationService,
    private teams: TeamService,
  ) {}

  // ─── Organizations ────────────────────────────────────────────────────────────

  @Post()
  @ApiOperation({ summary: 'Create a new organization (auto-adds caller as OWNER)' })
  async createOrganization(@CurrentUser('userId') userId: string, @Body() dto: CreateOrganizationDto, @Req() req: Request) {
    const { ipAddress, userAgent } = extractRequestContext(req);
    return this.orgs.createOrganization(userId, dto, ipAddress, userAgent);
  }

  @Get()
  @ApiOperation({ summary: 'List all organizations the current user belongs to' })
  async listOrganizations(@CurrentUser('userId') userId: string) {
    return this.orgs.listOrganizations(userId);
  }

  @Get(':orgId')
  @ApiOperation({ summary: 'Get a specific organization' })
  async getOrganization(@CurrentUser() user: any, @Param('orgId') orgId: string) {
    return this.orgs.getOrganization(user.userId, orgId);
  }

  @Patch(':orgId')
  @ApiOperation({ summary: 'Update organization (ADMIN+)' })
  async updateOrganization(
    @CurrentUser() user: any,
    @Param('orgId') orgId: string,
    @Body() dto: UpdateOrganizationDto,
    @Req() req: Request,
  ) {
    const { ipAddress, userAgent } = extractRequestContext(req);
    return this.orgs.updateOrganization(user.userId, orgId, dto, ipAddress, userAgent);
  }

  @Delete(':orgId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete organization (OWNER only)' })
  async deleteOrganization(@CurrentUser() user: any, @Param('orgId') orgId: string, @Req() req: Request) {
    const { ipAddress, userAgent } = extractRequestContext(req);
    return this.orgs.deleteOrganization(user.userId, orgId, ipAddress, userAgent);
  }

  // ─── Roles ────────────────────────────────────────────────────────────────────

  @Post(':orgId/roles')
  @ApiOperation({ summary: 'Create a custom role (ADMIN+)' })
  async createRole(
    @CurrentUser() user: any,
    @Param('orgId') orgId: string,
    @Body() dto: CreateRoleDto,
    @Req() req: Request,
  ) {
    const { ipAddress, userAgent } = extractRequestContext(req);
    return this.orgs.createRole(user.userId, orgId, dto, ipAddress, userAgent);
  }

  @Get(':orgId/roles')
  @ApiOperation({ summary: 'List all roles in the organization' })
  async listRoles(@CurrentUser() user: any, @Param('orgId') orgId: string) {
    return this.orgs.listRoles(user.userId, orgId);
  }

  @Patch(':orgId/roles/:roleId')
  @ApiOperation({ summary: 'Update a role (ADMIN+)' })
  async updateRole(
    @CurrentUser() user: any,
    @Param('orgId') orgId: string,
    @Param('roleId') roleId: string,
    @Body() dto: UpdateRoleDto,
    @Req() req: Request,
  ) {
    const { ipAddress, userAgent } = extractRequestContext(req);
    return this.orgs.updateRole(user.userId, orgId, roleId, dto, ipAddress, userAgent);
  }

  // ─── Members ─────────────────────────────────────────────────────────────────

  @Get(':orgId/members')
  @ApiOperation({ summary: 'List all members of the organization' })
  async listMembers(@CurrentUser() user: any, @Param('orgId') orgId: string) {
    return this.orgs.listMembers(user.userId, orgId);
  }

  @Patch(':orgId/members/:targetUserId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update a member\'s role (ADMIN+)' })
  async updateMemberRole(
    @CurrentUser() user: any,
    @Param('orgId') orgId: string,
    @Param('targetUserId') targetUserId: string,
    @Body() dto: UpdateMemberRoleDto,
    @Req() req: Request,
  ) {
    const { ipAddress, userAgent } = extractRequestContext(req);
    return this.orgs.updateMemberRole(user.userId, orgId, targetUserId, dto.roleId, ipAddress, userAgent);
  }

  @Delete(':orgId/members/:targetUserId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Remove a member from the organization (ADMIN+)' })
  async removeMember(
    @CurrentUser() user: any,
    @Param('orgId') orgId: string,
    @Param('targetUserId') targetUserId: string,
    @Req() req: Request,
  ) {
    const { ipAddress, userAgent } = extractRequestContext(req);
    return this.orgs.removeMember(user.userId, orgId, targetUserId, ipAddress, userAgent);
  }

  // ─── Invitations ─────────────────────────────────────────────────────────────

  @Post(':orgId/invitations')
  @ApiOperation({ summary: 'Invite someone by email (ADMIN+)' })
  async inviteMember(
    @CurrentUser() user: any,
    @Param('orgId') orgId: string,
    @Body() dto: InviteMemberDto,
    @Req() req: Request,
  ) {
    const { ipAddress, userAgent } = extractRequestContext(req);
    return this.orgs.inviteMember(user.userId, orgId, dto, ipAddress, userAgent);
  }

  @Get(':orgId/invitations')
  @ApiOperation({ summary: 'List pending invitations (ADMIN+)' })
  async listInvitations(@CurrentUser() user: any, @Param('orgId') orgId: string) {
    return this.orgs.listInvitations(user.userId, orgId);
  }

  @Delete(':orgId/invitations/:invitationId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Revoke an invitation (ADMIN+)' })
  async revokeInvitation(
    @CurrentUser() user: any,
    @Param('orgId') orgId: string,
    @Param('invitationId') invitationId: string,
    @Req() req: Request,
  ) {
    const { ipAddress, userAgent } = extractRequestContext(req);
    return this.orgs.revokeInvitation(user.userId, orgId, invitationId, ipAddress, userAgent);
  }

  // ─── Teams ───────────────────────────────────────────────────────────────────

  @Post(':orgId/teams')
  @ApiOperation({ summary: 'Create a team (ADMIN+)' })
  async createTeam(
    @CurrentUser() user: any,
    @Param('orgId') orgId: string,
    @Body() dto: CreateTeamDto,
    @Req() req: Request,
  ) {
    const { ipAddress, userAgent } = extractRequestContext(req);
    return this.teams.createTeam(user.userId, orgId, dto, ipAddress, userAgent);
  }

  @Get(':orgId/teams')
  @ApiOperation({ summary: 'List all teams in the organization' })
  async listTeams(@CurrentUser() user: any, @Param('orgId') orgId: string) {
    return this.teams.listTeams(user.userId, orgId);
  }

  @Get(':orgId/teams/:teamId')
  @ApiOperation({ summary: 'Get a specific team' })
  async getTeam(@CurrentUser() user: any, @Param('orgId') orgId: string, @Param('teamId') teamId: string) {
    return this.teams.getTeam(user.userId, orgId, teamId);
  }

  @Patch(':orgId/teams/:teamId')
  @ApiOperation({ summary: 'Update a team (ADMIN+)' })
  async updateTeam(
    @CurrentUser() user: any,
    @Param('orgId') orgId: string,
    @Param('teamId') teamId: string,
    @Body() dto: UpdateTeamDto,
    @Req() req: Request,
  ) {
    const { ipAddress, userAgent } = extractRequestContext(req);
    return this.teams.updateTeam(user.userId, orgId, teamId, dto, ipAddress, userAgent);
  }

  @Delete(':orgId/teams/:teamId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete a team (ADMIN+)' })
  async deleteTeam(@CurrentUser() user: any, @Param('orgId') orgId: string, @Param('teamId') teamId: string, @Req() req: Request) {
    const { ipAddress, userAgent } = extractRequestContext(req);
    return this.teams.deleteTeam(user.userId, orgId, teamId, ipAddress, userAgent);
  }

  @Post(':orgId/teams/:teamId/members')
  @ApiOperation({ summary: 'Add a member to a team (ADMIN+)' })
  async addTeamMember(
    @CurrentUser() user: any,
    @Param('orgId') orgId: string,
    @Param('teamId') teamId: string,
    @Body() dto: AddTeamMemberDto,
    @Req() req: Request,
  ) {
    const { ipAddress, userAgent } = extractRequestContext(req);
    return this.teams.addMember(user.userId, orgId, teamId, dto, ipAddress, userAgent);
  }

  @Delete(':orgId/teams/:teamId/members/:targetUserId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Remove a member from a team (ADMIN+)' })
  async removeTeamMember(
    @CurrentUser() user: any,
    @Param('orgId') orgId: string,
    @Param('teamId') teamId: string,
    @Param('targetUserId') targetUserId: string,
    @Req() req: Request,
  ) {
    const { ipAddress, userAgent } = extractRequestContext(req);
    return this.teams.removeMember(user.userId, orgId, teamId, targetUserId, ipAddress, userAgent);
  }

  @Patch(':orgId/teams/:teamId/members/:targetUserId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update a team member\'s role (ADMIN+)' })
  async updateTeamMemberRole(
    @CurrentUser() user: any,
    @Param('orgId') orgId: string,
    @Param('teamId') teamId: string,
    @Param('targetUserId') targetUserId: string,
    @Body() dto: UpdateTeamMemberRoleDto,
    @Req() req: Request,
  ) {
    const { ipAddress, userAgent } = extractRequestContext(req);
    return this.teams.updateMemberRole(user.userId, orgId, teamId, targetUserId, dto.role, ipAddress, userAgent);
  }
}

// Public invitation acceptance — no auth guard
@Controller('invitations')
export class InvitationAcceptController {
  constructor(private orgs: OrganizationService) {}

  @Post('accept')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Accept an organization invitation by token' })
  async acceptInvitation(@Body() dto: AcceptInvitationDto, @Req() req: Request) {
    const { ipAddress, userAgent } = extractRequestContext(req);
    return this.orgs.acceptInvitation(dto.token, ipAddress, userAgent);
  }
}
