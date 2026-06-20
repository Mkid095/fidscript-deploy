import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  Req,
  Res,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '@/modules/auth/jwt-auth.guard';
import { Request, Response } from 'express';
import { extractRequestContext } from '@/common/request-context';
import { AppAuthUserService } from '@/modules/app-auth/services/app-auth-user.service';
import { AppAuthRoleService } from '@/modules/app-auth/services/app-auth-role.service';
import { OAuthService } from '@/modules/app-auth/services/oauth.service';
import { AppAuthTokenService } from '@/modules/app-auth/services/app-auth-token.service';
import { AppJwtGuard } from '@/modules/app-auth/jwt/app-jwt.guard';
import { CurrentAppUser } from '@/modules/app-auth/current-app-user.decorator';
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
    private oauthService: OAuthService,
    private tokenService: AppAuthTokenService,
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

  // ── OAuth ───────────────────────────────────────────────────────────────

  @Get('oauth/:provider')
  @HttpCode(HttpStatus.FOUND)
  @ApiOperation({ summary: 'Redirect to OAuth provider authorize URL' })
  async oauthAuthorize(
    @Param('projectId') projectId: string,
    @Param('provider') provider: string,
    @Query('redirect') appRedirectUrl: string | undefined,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { ipAddress, userAgent } = extractRequestContext(req);
    const { url } = await this.oauthService.startAuthorization(
      projectId, provider, appRedirectUrl, ipAddress, userAgent,
    );
    res.status(HttpStatus.FOUND);
    res.setHeader('Location', url);
    return { url };
  }

  @Get('oauth/:provider/callback')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'OAuth callback — exchanges code, creates/links AppUser, returns tokens' })
  async oauthCallback(
    @Param('projectId') projectId: string,
    @Param('provider') provider: string,
    @Query('code') code: string | undefined,
    @Query('state') state: string | undefined,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { ipAddress, userAgent } = extractRequestContext(req);
    const result = await this.oauthService.handleCallback(
      projectId, provider, code ?? '', state ?? '', ipAddress, userAgent,
    );
    // If the client passed a redirect URL via state, redirect with tokens as query params.
    if (result.appRedirectUrl) {
      const params = new URLSearchParams({
        access_token: result.tokens.accessToken,
        refresh_token: result.tokens.refreshToken,
        expires_at: String(Math.floor(result.tokens.expiresAt.getTime() / 1000)),
      });
      const redirectUrl = `${result.appRedirectUrl}?${params.toString()}`;
      res.status(HttpStatus.FOUND);
      res.setHeader('Location', redirectUrl);
      return;
    }
    return {
      accessToken: result.tokens.accessToken,
      refreshToken: result.tokens.refreshToken,
      expiresAt: result.tokens.expiresAt,
      user: result.appUser,
    };
  }

  // ── Token management ────────────────────────────────────────────────────

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Rotate refresh token and issue a new access token' })
  async refresh(
    @Body() body: { refreshToken: string },
    @Req() req: Request,
  ) {
    const { ipAddress, userAgent } = extractRequestContext(req);
    const tokens = await this.tokenService.rotateRefresh(
      body.refreshToken, ipAddress, userAgent,
    );
    return tokens;
  }

  @Get('me')
  @UseGuards(AppJwtGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Return the currently authenticated app user' })
  async me(@CurrentAppUser() user: any) {
    return {
      appUserId: user.appUserId,
      projectId: user.projectId,
      email: user.email,
      roles: user.roles,
    };
  }

  @Post('logout')
  @UseGuards(AppJwtGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Revoke the current session (logout)' })
  async logout(@CurrentAppUser() user: any) {
    await this.tokenService.revokeSession(user.sessionId);
    return { success: true };
  }

  // ── Role management (platform admin) ────────────────────────────────────
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
