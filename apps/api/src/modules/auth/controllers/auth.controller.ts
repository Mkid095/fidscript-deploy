import {
  Controller, Get, Post, Patch, Delete, Body, Param,
  Req, UseGuards, HttpCode, HttpStatus, UnauthorizedException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { Request } from 'express';
import { AuthService } from '@/modules/auth/services/auth.service';
import { JwtAuthGuard } from '@/modules/auth/jwt-auth.guard';
import { AuthUser, CurrentUser } from '@/modules/auth/current-user.decorator';
import { extractRequestContext } from '@/common/request-context';
import {
  RegisterDto, LoginDto, MagicLinkDto, VerifyMagicLinkDto,
  CreateApiKeyDto, UpdateProfileDto, RefreshTokenDto,
} from '@/modules/auth/dto/index';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('register')
  @ApiOperation({ summary: 'Register a new account' })
  async register(@Body() dto: RegisterDto, @Req() req: Request) {
    const { ipAddress, userAgent } = extractRequestContext(req);
    return this.authService.register(dto, ipAddress, userAgent);
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Login with email and password' })
  async login(@Body() dto: LoginDto, @Req() req: Request) {
    const { ipAddress, userAgent } = extractRequestContext(req);
    return this.authService.login(dto, ipAddress, userAgent);
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
  async logout(@CurrentUser() user: AuthUser) {
    if (!user.sessionId) {
      throw new UnauthorizedException('No active session to revoke');
    }
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
  async verifyMagicLink(@Body() dto: VerifyMagicLinkDto, @Req() req: Request) {
    const { ipAddress } = extractRequestContext(req);
    return this.authService.verifyMagicLink(dto, ipAddress);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current user profile' })
  async me(@CurrentUser('userId') userId: string) {
    return this.authService.getProfile(userId);
  }

  @Patch('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update current user profile' })
  async updateProfile(@CurrentUser('userId') userId: string, @Body() dto: UpdateProfileDto) {
    return this.authService.updateProfile(userId, dto);
  }

  @Get('sessions')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List all active sessions' })
  async getSessions(@CurrentUser('userId') userId: string) {
    const sessions = await this.authService.getSessions(userId);
    return { sessions };
  }

  @Delete('sessions/:id')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Revoke a specific session' })
  async revokeSession(@CurrentUser('userId') userId: string, @Param('id') sessionId: string) {
    await this.authService.revokeSession(userId, sessionId);
    return { success: true };
  }

  @Delete('sessions')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Revoke all sessions' })
  async revokeAllSessions(@CurrentUser('userId') userId: string) {
    await this.authService.revokeAllSessions(userId);
    return { success: true };
  }

  @Get('api-keys')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List all API keys' })
  async getApiKeys(@CurrentUser('userId') userId: string) {
    const apiKeys = await this.authService.getApiKeys(userId);
    return { apiKeys };
  }

  @Post('api-keys')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a new API key' })
  async createApiKey(@CurrentUser('userId') userId: string, @Body() dto: CreateApiKeyDto) {
    return this.authService.createApiKey(userId, dto);
  }

  @Delete('api-keys/:id')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Revoke an API key' })
  async revokeApiKey(@CurrentUser('userId') userId: string, @Param('id') keyId: string) {
    await this.authService.revokeApiKey(userId, keyId);
    return { success: true };
  }
}
