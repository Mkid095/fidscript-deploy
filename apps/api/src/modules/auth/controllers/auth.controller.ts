import {
  Controller, Get, Post, Patch, Delete, Body, Param,
  Headers, Req, UseGuards, HttpCode, HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from '@nestjs/swagger';
import { AuthService } from '@/modules/auth/services/auth.service';
import { JwtAuthGuard } from '@/modules/auth/jwt-auth.guard';
import { RegisterDto, LoginDto, MagicLinkDto, VerifyMagicLinkDto, CreateApiKeyDto, UpdateProfileDto, RefreshTokenDto } from '@/modules/auth/dto/index';
import { Request } from 'express';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('register')
  @ApiOperation({ summary: 'Register a new account' })
  async register(@Body() dto: RegisterDto, @Headers('x-forwarded-for') ip?: string, @Headers('user-agent') userAgent?: string) {
    return this.authService.register(dto, ip, userAgent);
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Login with email and password' })
  async login(@Body() dto: LoginDto, @Headers('x-forwarded-for') ip?: string, @Headers('user-agent') userAgent?: string) {
    return this.authService.login(dto, ip, userAgent);
  }

  @Post('refresh')
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
  async logout(@Req() req: Request) {
    const user = req.user as { sessionId: string; userId: string };
    await this.authService.logout(user.sessionId, user.userId);
    return { success: true };
  }

  @Post('magic-link')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Request magic link login' })
  async magicLink(@Body() dto: MagicLinkDto) {
    return this.authService.magicLink(dto);
  }

  @Post('verify-magic-link')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Verify magic link token' })
  async verifyMagicLink(@Body() dto: VerifyMagicLinkDto, @Headers('x-forwarded-for') ip?: string) {
    return this.authService.verifyMagicLink(dto, ip);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current user profile' })
  async me(@Req() req: Request) {
    return this.authService.getProfile((req.user as { userId: string }).userId);
  }

  @Patch('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update current user profile' })
  async updateProfile(@Req() req: Request, @Body() dto: UpdateProfileDto) {
    return this.authService.updateProfile((req.user as { userId: string }).userId, dto);
  }

  @Get('sessions')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List all active sessions' })
  async getSessions(@Req() req: Request) {
    const sessions = await this.authService.getSessions((req.user as { userId: string }).userId);
    return { sessions };
  }

  @Delete('sessions/:id')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Revoke a specific session' })
  async revokeSession(@Req() req: Request, @Param('id') sessionId: string) {
    await this.authService.revokeSession((req.user as { userId: string }).userId, sessionId);
    return { success: true };
  }

  @Delete('sessions')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Revoke all sessions' })
  async revokeAllSessions(@Req() req: Request) {
    await this.authService.revokeAllSessions((req.user as { userId: string }).userId);
    return { success: true };
  }

  @Get('api-keys')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List all API keys' })
  async getApiKeys(@Req() req: Request) {
    const apiKeys = await this.authService.getApiKeys((req.user as { userId: string }).userId);
    return { apiKeys };
  }

  @Post('api-keys')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a new API key' })
  async createApiKey(@Req() req: Request, @Body() dto: CreateApiKeyDto) {
    return this.authService.createApiKey((req.user as { userId: string }).userId, dto);
  }

  @Delete('api-keys/:id')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Revoke an API key' })
  async revokeApiKey(@Req() req: Request, @Param('id') keyId: string) {
    await this.authService.revokeApiKey((req.user as { userId: string }).userId, keyId);
    return { success: true };
  }
}
