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
 * path.
 *
 * Graceful degradation: if REDIS_URL is unset or Redis is unreachable, no
 * adapter is attached and the gateway runs single-instance.
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

      // Reconnection strategy: clean up multiplex channels before reconnecting to
      // avoid "orphaned data for stream" errors when Redis reconnects after a
      // temporary network blip. Removing listeners on 'reconnecting' ensures
      // stale multiplex state is discarded before the new connection is established.
      const setupReconnectCleanup = (client: Awaited<ReturnType<typeof createClient>>) => {
        client.on('reconnecting', () => {
          this.logger.debug('Redis client reconnecting — clearing multiplex state');
          client.removeAllListeners();
        });
      };

      const pubClient = createClient({ url: this.redisUrl });
      const subClient = pubClient.duplicate();
      setupReconnectCleanup(pubClient);
      setupReconnectCleanup(subClient);

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
    const server = super.createIOServer(port, {
      // Increase max payload size to prevent "malformed chunk" errors when
      // large audit/event payloads flow through multiplexed streams.
      maxHttpBufferSize: 5 * 1024 * 1024, // 5 MB (default is 1 MB)
      ...options,
    }) as {
      adapter?: (adapter: unknown) => unknown;
      setMaxListeners?: (n: number) => void;
    };
    if (this.adapterConstructor && typeof server.adapter === 'function') {
      server.adapter(this.adapterConstructor);
    }
    if (server.setMaxListeners) {
      server.setMaxListeners(30);
    }
    return server;
  }
}
