import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
  Req,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AppAuthService } from './app-auth.service';
import {
  RegisterAppUserDto,
  LoginAppUserDto,
  MagicLinkDto,
  VerifyMagicLinkDto,
  CreateRoleDto,
  AssignRoleDto,
} from './dto/index';
import { Request } from 'express';

@ApiTags('app-auth')
@Controller('projects/:projectId/auth')
export class AppAuthController {
  constructor(private appAuthService: AppAuthService) {}

  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Register app user' })
  async register(
    @Param('projectId') projectId: string,
    @Body() dto: RegisterAppUserDto,
  ) {
    return this.appAuthService.register(projectId, dto);
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Login app user' })
  async login(
    @Param('projectId') projectId: string,
    @Body() dto: LoginAppUserDto,
  ) {
    return this.appAuthService.login(projectId, dto);
  }

  @Post('magic-link')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Request magic link' })
  async magicLink(
    @Param('projectId') projectId: string,
    @Body() dto: MagicLinkDto,
  ) {
    return this.appAuthService.magicLink(projectId, dto);
  }

  @Post('verify-magic-link')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Verify magic link' })
  async verifyMagicLink(
    @Param('projectId') projectId: string,
    @Body() dto: VerifyMagicLinkDto,
  ) {
    return this.appAuthService.verifyMagicLink(projectId, dto);
  }

  @Post('roles')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create role' })
  async createRole(
    @Param('projectId') projectId: string,
    @Body() dto: CreateRoleDto,
  ) {
    return this.appAuthService.createRole(projectId, dto);
  }

  @Get('roles')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List roles' })
  async listRoles(@Param('projectId') projectId: string) {
    const roles = await this.appAuthService.listRoles(projectId);
    return { roles };
  }

  @Post('roles/assign')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Assign role to user' })
  async assignRole(
    @Param('projectId') projectId: string,
    @Body() dto: AssignRoleDto,
  ) {
    return this.appAuthService.assignRole(projectId, dto);
  }
}
