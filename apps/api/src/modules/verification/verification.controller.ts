import { Controller, Get, Headers, UnauthorizedException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';

/**
 * Domain routing verification endpoint.
 *
 * GET /.well-known/fidscript
 *
 * Called by DomainsService.verify() during the HTTP routing check.
 * Returns JSON confirming the request reached the platform.
 *
 * In the future, this could return per-domain info (which deployment serves this domain)
 * by inspecting the Host header, but for now it's a simple confirmation.
 */
@ApiTags('verification')
@Controller('.well-known')
export class VerificationController {
  constructor(private configService: ConfigService) {}

  @Get('fidscript')
  @ApiOperation({ summary: 'Domain routing verification token' })
  @ApiResponse({ status: 200, description: 'Platform routing confirmation' })
  getVerificationToken(@Headers('host') host: string) {
    return {
      fidscript: true,
      ok: true,
      timestamp: new Date().toISOString(),
      message: 'FIDScript platform routing is working',
    };
  }
}
