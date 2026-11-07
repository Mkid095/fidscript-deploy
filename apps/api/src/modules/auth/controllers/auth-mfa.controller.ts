import { Controller, Get, Post, Body, UseGuards, HttpCode, HttpStatus, Req } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { Request } from 'express';
import { JwtAuthGuard } from '@/modules/auth/jwt-auth.guard';
import { CurrentUser } from '@/modules/auth/current-user.decorator';
import { Public } from '@/modules/auth/decorators/public.decorator';
import { extractRequestContext } from '@/common/request-context';
import { AuthMfaService } from '@/modules/auth/services/auth-mfa.service';
import { MfaCodeDto, MfaChallengeDto, MfaSetupDto, MfaDisableDto } from '@/modules/auth/dto/mfa.dto';

/**
 * Multi-factor authentication for a platform user.
 *
 * Enrollment needs a session; the challenge does not — it is the second half
 * of a sign-in that already proved the password, and the challenge token is
 * the proof of that first half.
 */
@ApiTags('mfa')
@Controller('auth/mfa')
export class AuthMfaController {
  constructor(private readonly mfa: AuthMfaService) {}

  /**
   * POST /auth/mfa/setup
   *
   * Returns the secret and the otpauth URL for the authenticator app.
   *
   * When MFA is already on, the current factor is required — otherwise a
   * stolen session could replace somebody's second factor.
   */
  @Post('setup')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Set up TOTP MFA — returns secret + otpauth URL' })
  async setup(@CurrentUser('userId') userId: string, @Body() dto: MfaSetupDto) {
    return this.mfa.setup(userId, dto?.code);
  }

  /** POST /auth/mfa/verify — confirms the first code and turns MFA on. */
  @Post('verify')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Verify TOTP code and enable MFA' })
  async verify(@CurrentUser('userId') userId: string, @Body() dto: MfaCodeDto) {
    return this.mfa.enable(userId, dto.code);
  }

  /**
   * GET /auth/mfa/status
   *
   * Whether MFA is on, and how many recovery codes are left.
   */
  @Get('status')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'MFA status and remaining recovery codes' })
  async status(@CurrentUser('userId') userId: string) {
    return this.mfa.status(userId);
  }

  /**
   * POST /auth/mfa/recovery-codes
   *
   * Generates a fresh set of recovery codes. They are returned **once**, in
   * plain — the stored form is a hash.
   */
  @Post('recovery-codes')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Generate recovery codes (shown once)' })
  async recoveryCodes(@CurrentUser('userId') userId: string) {
    return this.mfa.generateRecoveryCodes(userId);
  }

  /** POST /auth/mfa/disable — needs the password or a code from the app. */
  @Post('disable')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Turn MFA off (needs a reauthentication)' })
  async disable(@CurrentUser('userId') userId: string, @Body() dto: MfaDisableDto) {
    return this.mfa.disable(userId, {
      password: dto?.password,
      code: dto?.code,
    });
  }

  /**
   * POST /auth/mfa/challenge
   *
   * The second half of a sign-in. Public, because the person is not signed
   * in yet — the challenge token is the proof of the first half.
   */
  @Post('challenge')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Complete MFA login with challenge token + code' })
  async challenge(@Body() dto: MfaChallengeDto, @Req() req: Request) {
    const { ipAddress, userAgent } = extractRequestContext(req);
    return this.mfa.completeLogin(dto, ipAddress, userAgent);
  }
}
