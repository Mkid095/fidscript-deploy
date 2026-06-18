import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';

export interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: Date;
  services: {
    database: ServiceHealth;
    redis: ServiceHealth;
    nats: ServiceHealth;
    storage: ServiceHealth;
  };
}

export interface ServiceHealth {
  status: 'up' | 'down' | 'unknown';
  latencyMs?: number;
  error?: string;
}

@Injectable()
export class HealthService {
  constructor(
    private prisma: PrismaService,
    private configService: ConfigService,
  ) {}

  async getHealth(): Promise<HealthStatus> {
    const [database, redis, nats, storage] = await Promise.all([
      this.checkDatabase(),
      this.checkRedis(),
      this.checkNats(),
      this.checkStorage(),
    ]);

    const allUp = [database, redis, nats, storage].every(s => s.status === 'up');
    const anyDown = [database, redis, nats, storage].some(s => s.status === 'down');

    return {
      status: allUp ? 'healthy' : anyDown ? 'unhealthy' : 'degraded',
      timestamp: new Date(),
      services: { database, redis, nats, storage },
    };
  }

  async checkDatabase(): Promise<ServiceHealth> {
    const start = Date.now();
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return { status: 'up', latencyMs: Date.now() - start };
    } catch (error) {
      return { status: 'down', latencyMs: Date.now() - start, error: (error as Error).message };
    }
  }

  async checkRedis(): Promise<ServiceHealth> {
    const start = Date.now();
    const redisUrl = this.configService.get<string>('REDIS_URL');
    if (!redisUrl) return { status: 'unknown', error: 'REDIS_URL not configured' };

    // Use the actual Redis protocol (PING) instead of HTTP — redis has
    // no HTTP endpoint, and string-replacing the scheme to http://
    // produced an invalid URL like "http://:<password>@host:6379/health".
    try {
      const { createClient } = await import('redis');
      const client = createClient({ url: redisUrl });
      await client.connect();
      const pong = await client.ping();
      await client.quit();
      return { status: pong === 'PONG' ? 'up' : 'down', latencyMs: Date.now() - start };
    } catch (error) {
      return { status: 'down', latencyMs: Date.now() - start, error: (error as Error).message };
    }
  }

  async checkNats(): Promise<ServiceHealth> {
    const start = Date.now();
    const natsUrl = this.configService.get<string>('NATS_URL');
    if (!natsUrl) return { status: 'unknown', error: 'NATS_URL not configured' };

    try {
      const { connect } = await import('nats');
      const nc = await connect({ servers: [natsUrl], timeout: 3000 });
      await nc.close();
      return { status: 'up', latencyMs: Date.now() - start };
    } catch (error) {
      return { status: 'down', latencyMs: Date.now() - start, error: (error as Error).message };
    }
  }

  async checkStorage(): Promise<ServiceHealth> {
    const start = Date.now();
    const minioEndpoint = this.configService.get<string>('MINIO_ENDPOINT');
    if (!minioEndpoint) return { status: 'unknown', error: 'MINIO_ENDPOINT not configured' };

    try {
      const response = await fetch(`http://${minioEndpoint}/minio/health/live`, {
        method: 'GET',
      });
      return { status: response.ok ? 'up' : 'down', latencyMs: Date.now() - start };
    } catch (error) {
      return { status: 'down', latencyMs: Date.now() - start, error: (error as Error).message };
    }
  }
}
