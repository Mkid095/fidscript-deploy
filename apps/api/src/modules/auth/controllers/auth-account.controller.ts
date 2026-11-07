import { Controller, Get, Post, Patch, Delete, Body, Param, UseGuards, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '@/modules/auth/jwt-auth.guard';
import { CurrentUser } from '@/modules/auth/current-user.decorator';
import { AuthService } from '@/modules/auth/services/auth.service';
import { UpdateProfileDto } from '@/modules/auth/dto/profile.dto';
import { CreateApiKeyDto } from '@/modules/auth/dto/api-key.dto';

/**
 * The account: the profile, the sessions and the API keys.
 *
 * Separate from the sign-in routes, because changing an account and signing
 * into one are different things.
 */
@ApiTags('account')
@Controller('auth')
export class AuthAccountController {
  constructor(private readonly authService: AuthService) {}

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

  /**
   * POST /auth/onboarding/complete
   *
   * The person finished the first-time journey.
   */
  @Post('onboarding/complete')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Mark the first-time journey as done' })
  async completeOnboarding(@CurrentUser('userId') userId: string) {
    return this.authService.completeOnboarding(userId);
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
