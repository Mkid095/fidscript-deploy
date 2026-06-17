import {
  Controller,
  Post,
  Get,
  Patch,
  Delete,
  Body,
  Param,
  Headers,
  Req,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from '@nestjs/swagger';
import { AuthService, AuthResponse } from './auth.service';
import { JwtAuthGuard } from './jwt-auth.guard';
import {
  RegisterDto,
  LoginDto,
  MagicLinkDto,
  VerifyMagicLinkDto,
  CreateApiKeyDto,
  UpdateProfileDto,
} from './dto/index';
import { Request } from 'express';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('register')
  @ApiOperation({ summary: 'Register a new account' })
  @ApiResponse({ status: 201, type: Object })
  @ApiResponse({ status: 409, description: 'Email already registered' })
  async register(
    @Body() dto: RegisterDto,
    @Headers('x-forwarded-for') ip?: string,
  ) {
    return this.authService.register(dto, ip);
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Login with email and password' })
  @ApiResponse({ status: 200, type: Object })
  @ApiResponse({ status: 401, description: 'Invalid credentials' })
  async login(
    @Body() dto: LoginDto,
    @Headers('x-forwarded-for') ip?: string,
    @Headers('user-agent') userAgent?: string,
  ) {
    return this.authService.login(dto, ip, userAgent);
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
  @ApiResponse({ status: 200, type: Object })
  @ApiResponse({ status: 401, description: 'Invalid or expired token' })
  async verifyMagicLink(
    @Body() dto: VerifyMagicLinkDto,
    @Headers('x-forwarded-for') ip?: string,
  ) {
    return this.authService.verifyMagicLink(dto, ip);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current user profile' })
  @ApiResponse({ status: 200 })
  @ApiResponse({ status: 401 })
  async me(@Req() req: Request) {
    const user = req.user as { userId: string };
    return this.authService.getProfile(user.userId);
  }

  @Patch('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update current user profile' })
  async updateProfile(@Req() req: Request, @Body() dto: UpdateProfileDto) {
    const user = req.user as { userId: string };
    return this.authService.updateProfile(user.userId, dto);
  }

  @Get('sessions')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List all active sessions' })
  async getSessions(@Req() req: Request) {
    const user = req.user as { userId: string };
    const sessions = await this.authService.getSessions(user.userId);
    return { sessions };
  }

  @Delete('sessions/:id')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Revoke a specific session' })
  @ApiResponse({ status: 404, description: 'Session not found' })
  async revokeSession(@Req() req: Request, @Param('id') sessionId: string) {
    const user = req.user as { userId: string };
    await this.authService.revokeSession(user.userId, sessionId);
    return { success: true };
  }

  @Delete('sessions')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Revoke all sessions' })
  async revokeAllSessions(@Req() req: Request) {
    const user = req.user as { userId: string };
    await this.authService.revokeAllSessions(user.userId);
    return { success: true };
  }

  @Get('api-keys')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List all API keys' })
  async getApiKeys(@Req() req: Request) {
    const user = req.user as { userId: string };
    const apiKeys = await this.authService.getApiKeys(user.userId);
    return { apiKeys };
  }

  @Post('api-keys')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a new API key' })
  async createApiKey(@Req() req: Request, @Body() dto: CreateApiKeyDto) {
    const user = req.user as { userId: string };
    return this.authService.createApiKey(user.userId, dto);
  }

  @Delete('api-keys/:id')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Revoke an API key' })
  @ApiResponse({ status: 404, description: 'API key not found' })
  async revokeApiKey(@Req() req: Request, @Param('id') keyId: string) {
    const user = req.user as { userId: string };
    await this.authService.revokeApiKey(user.userId, keyId);
    return { success: true };
  }
}
