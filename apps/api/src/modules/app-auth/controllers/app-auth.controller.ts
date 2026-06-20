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
import { JwtAuthGuard } from '@/modules/auth/jwt-auth.guard';
import { Request } from 'express';
import { extractRequestContext } from '@/common/request-context';
import { AppAuthUserService } from '@/modules/app-auth/services/app-auth-user.service';
import { AppAuthRoleService } from '@/modules/app-auth/services/app-auth-role.service';
import {
  RegisterAppUserDto,
  LoginAppUserDto,
  MagicLinkDto,
  VerifyMagicLinkDto,
  CreateRoleDto,
  AssignRoleDto,
  MagicCodeDto,
  VerifyMagicCodeDto,
} from '@/modules/app-auth/dto/index';

@ApiTags('app-auth')
@Controller('projects/:projectId/auth')
export class AppAuthController {
  constructor(
    private userService: AppAuthUserService,
    private roleService: AppAuthRoleService,
  ) {}

  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Register app user' })
  async register(
    @Param('projectId') projectId: string,
    @Body() dto: RegisterAppUserDto,
  ) {
    return this.userService.register(projectId, dto);
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Login app user' })
  async login(
    @Param('projectId') projectId: string,
    @Body() dto: LoginAppUserDto,
  ) {
    return this.userService.login(projectId, dto);
  }

  @Post('magic-link')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Request magic link' })
  async magicLink(
    @Param('projectId') projectId: string,
    @Body() dto: MagicLinkDto,
  ) {
    return this.userService.magicLink(projectId, dto);
  }

  @Post('verify-magic-link')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Verify magic link' })
  async verifyMagicLink(
    @Param('projectId') projectId: string,
    @Body() dto: VerifyMagicLinkDto,
  ) {
    return this.userService.verifyMagicLink(projectId, dto);
  }

  @Post('magic-code')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Request a magic-code (OTP) sign-in code by email' })
  async magicCode(
    @Param('projectId') projectId: string,
    @Body() dto: MagicCodeDto,
    @Req() req: Request,
  ) {
    const { ipAddress } = extractRequestContext(req);
    return this.userService.requestCode(projectId, dto.email, ipAddress);
  }

  @Post('verify-magic-code')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Verify a magic code and sign in' })
  async verifyMagicCode(
    @Param('projectId') projectId: string,
    @Body() dto: VerifyMagicCodeDto,
    @Req() req: Request,
  ) {
    const { ipAddress } = extractRequestContext(req);
    return this.userService.verifyCode(projectId, dto.email, dto.code, ipAddress);
  }

  @Post('roles')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create role' })
  async createRole(
    @Param('projectId') projectId: string,
    @Body() dto: CreateRoleDto,
  ) {
    return this.roleService.createRole(projectId, dto);
  }

  @Get('roles')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List roles' })
  async listRoles(@Param('projectId') projectId: string) {
    const roles = await this.roleService.listRoles(projectId);
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
    return this.roleService.assignRole(projectId, dto);
  }
}
