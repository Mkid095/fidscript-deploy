import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { HealthService, HealthStatus } from './health.service.js';

@ApiTags('health')
@Controller('health')
export class HealthController {
  constructor(private healthService: HealthService) {}

  @Get()
  @ApiOperation({ summary: 'Get platform health status' })
  @ApiResponse({ status: 200, description: 'Health status' })
  async getHealth(): Promise<HealthStatus> {
    return this.healthService.getHealth();
  }

  @Get('live')
  @ApiOperation({ summary: 'Liveness probe' })
  @ApiResponse({ status: 200 })
  async getLiveness() {
    return { status: 'ok', timestamp: new Date() };
  }

  @Get('ready')
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
