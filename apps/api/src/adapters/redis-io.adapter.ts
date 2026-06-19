import { INestApplicationContext, Logger } from '@nestjs/common';
import { IoAdapter } from '@nestjs/platform-socket.io';
import { ServerOptions } from 'socket.io';

/**
 * Phase 13 — Socket.IO Redis pub/sub adapter.
 *
 * Attaches @socket.io/redis-adapter so `server.to(room).emit(...)` reaches
 * sockets connected to ANY API instance (multi-node correct from day one) and
 * keeps broadcast/presence state coherent across restarts. Built as a NestJS
 * IoAdapter and set via app.useWebSocketAdapter() in main.ts — the supported
 * path (attaching an adapter onto the @WebSocketServer object inside afterInit
 * is not reliable in NestJS: `server.adapter` is not a function there).
 *
 * Graceful degradation: if REDIS_URL is unset or Redis is unreachable, no
 * adapter is attached and the gateway runs single-instance. Connect is bounded
 * (redis@4 rejects on ECONNREFUSED and has its own socket timeout) and wrapped
 * so a Redis problem can never block API bootstrap (cf. ADR-023).
 */
export class RedisIoAdapter extends IoAdapter {
  private readonly logger = new Logger(RedisIoAdapter.name);
  private adapterConstructor: ((namespace: unknown) => unknown) | null = null;

  constructor(
    app: INestApplicationContext,
    private readonly redisUrl?: string,
  ) {
    super(app);
  }

  /** Connect pub/sub clients before the gateway server is created during
   *  app.listen(), so the adapter is ready in createIOServer(). Best-effort. */
  async connectToRedis(): Promise<void> {
    if (!this.redisUrl) {
      this.logger.warn('REDIS_URL unset — realtime runs single-instance (no Redis adapter)');
      return;
    }
    try {
      const { createClient } = await import('redis');
      const { createAdapter } = await import('@socket.io/redis-adapter');
      const pubClient = createClient({ url: this.redisUrl });
      const subClient = pubClient.duplicate();
      await Promise.all([pubClient.connect(), subClient.connect()]);
      this.adapterConstructor = createAdapter(pubClient, subClient) as (
        namespace: unknown,
      ) => unknown;
      this.logger.log('Socket.IO Redis adapter ready (multi-instance broadcasts enabled)');
    } catch (err: unknown) {
      this.adapterConstructor = null;
      this.logger.warn(
        `Redis adapter not attached — single-instance fallback: ${(err as Error).message}`,
      );
    }
  }

  createIOServer(port: number, options?: ServerOptions): unknown {
    const server = super.createIOServer(port, options) as {
      adapter?: (adapter: unknown) => unknown;
    };
    if (this.adapterConstructor && typeof server.adapter === 'function') {
      server.adapter(this.adapterConstructor);
    }
    return server;
  }
}
