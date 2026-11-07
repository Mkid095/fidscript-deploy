import { Controller, Get, Inject } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { PlatformMailService } from '@/modules/email/platform-mail.service';
import { HealthService, HealthStatus } from './health.service';
import { Public } from '@/modules/auth/decorators/public.decorator';

@ApiTags('health')
@Controller('health')
export class HealthController {
  constructor(
    private healthService: HealthService,
    private platformMailService: PlatformMailService,
  ) {}

  @Get()

  @Public()
  @ApiOperation({ summary: 'Get platform health status' })
  @ApiResponse({ status: 200, description: 'Health status' })
  async getHealth(): Promise<HealthStatus> {
    return this.healthService.getHealth();
  }

  @Get('email')

  @Public()
  @ApiOperation({ summary: 'Email subsystem health — SMTP probe' })
  @ApiResponse({ status: 200, description: 'Email health status' })
  async getEmailHealth() {
    const result = await this.platformMailService.check();
    return {
      status: result.status === 'up' ? 'ok' : 'degraded',
      provider: 'stalwart',
      lastChecked: new Date().toISOString(),
      latencyMs: result.latencyMs,
      error: result.error,
    };
  }

  @Get('live')

  @Public()
  @ApiOperation({ summary: 'Liveness probe' })
  @ApiResponse({ status: 200 })
  async getLiveness() {
    return { status: 'ok', timestamp: new Date() };
  }

  @Get('ready')

  @Public()
  @ApiOperation({ summary: 'Readiness probe' })
  @ApiResponse({ status: 200 })
  async getReadiness() {
    const health = await this.healthService.getHealth();
    return {
      status: health.status === 'healthy' ? 'ready' : 'not_ready',
      timestamp: new Date(),
    };
  }
}
