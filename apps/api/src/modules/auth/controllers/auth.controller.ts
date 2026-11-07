import {
  Controller, Get, Post, Body, Param,
  Req, UseGuards, HttpCode, HttpStatus, UnauthorizedException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { Request } from 'express';
import { AuthService } from '@/modules/auth/services/auth.service';
import { JwtAuthGuard } from '@/modules/auth/jwt-auth.guard';
import { InstallationGuard } from '@/modules/auth/guards/installation.guard';
import { AuthUser, CurrentUser } from '@/modules/auth/current-user.decorator';
import { extractRequestContext } from '@/common/request-context';
import {
  RegisterDto, LoginDto, MagicCodeDto, VerifyMagicCodeDto,
  CreateApiKeyDto, UpdateProfileDto, RefreshTokenDto, MfaCodeDto, MfaChallengeDto,
  ChangePasswordDto,
  SendVerificationDto, VerifyEmailDto, ForgotPasswordDto, ConfirmPasswordResetDto, ConfirmMagicLinkDto,
} from '@/modules/auth/dto/index';
import { Public } from '@/modules/auth/decorators/public.decorator';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Get('auth-method/:email')

  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Look up preferred auth method for an email (used to pre-fill login)' })
  async lookupAuthMethod(@Param('email') email: string) {
    return this.authService.lookupAuthMethod(email.toLowerCase());
  }

  @Post('register')
  @UseGuards(InstallationGuard)
  @ApiOperation({ summary: 'Register a new account' })
  async register(@Body() dto: RegisterDto, @Req() req: Request) {
    const { ipAddress, userAgent } = extractRequestContext(req);
    return this.authService.register(dto, ipAddress, userAgent);
  }

  @Post('login')
  @UseGuards(InstallationGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Login with email and password' })
  async login(@Body() dto: LoginDto, @Req() req: Request) {
    const { ipAddress, userAgent } = extractRequestContext(req);
    return this.authService.login(dto, ipAddress, userAgent);
  }

  @Post('refresh')

  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Refresh access token' })
  async refresh(@Body() dto: RefreshTokenDto) {
    return this.authService.refreshToken(dto.refreshToken);
  }

  @Post('logout')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Logout current session' })
  async logout(@CurrentUser() user: AuthUser) {
    if (!user.sessionId) {
      throw new UnauthorizedException('No active session to revoke');
    }
    await this.authService.logout(user.sessionId, user.userId);
    return { success: true };
  }

  @Post('change-password')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Change password (clears mustChangePassword, rotates the session)' })
  async changePassword(
    @CurrentUser() user: AuthUser,
    @Body() dto: ChangePasswordDto,
    @Req() req: Request,
  ) {
    const { ipAddress, userAgent } = extractRequestContext(req);
    return this.authService.changePassword(user.userId, user.sessionId, dto, ipAddress, userAgent);
  }

  @Post('magic-code')
  @UseGuards(InstallationGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Request a 6-digit login code (email)' })
  async magicCode(@Body() dto: MagicCodeDto, @Req() req: Request) {
    const { ipAddress, userAgent } = extractRequestContext(req);
    return this.authService.magicCode(dto, ipAddress, userAgent);
  }

  @Post('verify-magic-code')
  @UseGuards(InstallationGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Verify the 6-digit login code' })
  async verifyMagicCode(@Body() dto: VerifyMagicCodeDto, @Req() req: Request) {
    const { ipAddress, userAgent } = extractRequestContext(req);
    return this.authService.verifyMagicCode(dto, ipAddress, userAgent);
  }

  // Phase 5.1 — Verification flows (email verify, password reset, magic link)
  @Post('send-verification')
  @UseGuards(InstallationGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Send a verification token (EMAIL_VERIFY, PASSWORD_RESET, or MAGIC_LINK)' })
  async sendVerification(@Body() dto: SendVerificationDto, @Req() req: Request) {
    const { ipAddress, userAgent } = extractRequestContext(req);
    return this.authService.sendVerification(dto, ipAddress, userAgent);
  }

  @Post('forgot-password')
  @UseGuards(InstallationGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Request a password reset email' })
  async forgotPassword(@Body() dto: ForgotPasswordDto, @Req() req: Request) {
    const { ipAddress, userAgent } = extractRequestContext(req);
    return this.authService.sendVerification({ ...dto, type: 'PASSWORD_RESET' as const }, ipAddress, userAgent);
  }

  @Post('verify-email')
  @UseGuards(InstallationGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Verify email address from token in verification link' })
  async verifyEmail(@Body() dto: VerifyEmailDto, @Req() req: Request) {
    const { ipAddress, userAgent } = extractRequestContext(req);
    return this.authService.verifyEmail(dto, ipAddress, userAgent);
  }

  @Post('password-reset')
  @UseGuards(InstallationGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Reset password using token from email link (consumes token, revokes sessions)' })
  async passwordReset(@Body() dto: ConfirmPasswordResetDto, @Req() req: Request) {
    const { ipAddress, userAgent } = extractRequestContext(req);
    return this.authService.confirmPasswordReset(dto, ipAddress, userAgent);
  }

  @Post('magic-link/verify')
  @UseGuards(InstallationGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Confirm magic link token and receive session tokens' })
  async confirmMagicLink(@Body() dto: ConfirmMagicLinkDto, @Req() req: Request) {
    const { ipAddress, userAgent } = extractRequestContext(req);
    return this.authService.confirmMagicLink(dto, ipAddress, userAgent);
  }
}
