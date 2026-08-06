import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import type { Request, Response } from 'express';
import { AppModule } from './app.module';
import { RedisIoAdapter } from './adapters/redis-io.adapter';

// Fix MaxListenersExceededWarning: the Node.js default is 10. Socket.IO clients
// that reconnect (e.g. behind a proxy with short timeouts) add new listeners each
// time. Set a reasonable global ceiling before any modules load.
import { EventEmitter } from 'events';
EventEmitter.defaultMaxListeners = 30;

process.on('unhandledRejection', (reason, promise) => {
  console.error('[FATAL] unhandledRejection:', reason);
});

process.on('uncaughtException', (err) => {
  console.error('[FATAL] uncaughtException:', err);
  process.exit(1);
});

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Serve the one-line installer at the root so `curl …/install.sh` works
  // outside the api/v1 prefix. The file is mounted into the container at
  // /usr/local/share/fidscript/install.sh (see docker-compose.yml).
  const { createReadStream, existsSync } = await import('node:fs');
  const INSTALL_SH = process.env.INSTALL_SCRIPT_PATH ?? '/usr/local/share/fidscript/install.sh';
  if (existsSync(INSTALL_SH)) {
    app.use('/install.sh', (_req: Request, res: Response) => {
      res.setHeader('Content-Type', 'application/x-sh');
      res.setHeader('Content-Disposition', 'attachment; filename="install.sh"');
      createReadStream(INSTALL_SH).pipe(res);
    });
  }

  app.setGlobalPrefix('api/v1', {
    exclude: ['metrics'],
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  // CORS — allow a comma-separated list of origins (e.g.
  // "https://deploy.fidscript.com,https://app.deploy.fidscript.com") so the
  // dashboard works whether it's served at the root domain or the app. alias.
  // Falls back to '*' if unset (dev only). '*' is incompatible with credentials,
  // so when CORS_ORIGIN is '*' we explicitly disable credentials.
  const corsOriginRaw = process.env.CORS_ORIGIN?.trim();
  const corsOrigin = corsOriginRaw && corsOriginRaw !== '*'
    ? corsOriginRaw.split(',').map((o) => o.trim()).filter(Boolean)
    : '*';
  const corsCredentials = corsOrigin !== '*';
  app.enableCors({
    origin: corsOrigin,
    credentials: corsCredentials,
  });

  const config = new DocumentBuilder()
    .setTitle('FIDScript Deploy API')
    .setDescription('Platform API for FIDScript Deploy')
    .setVersion('1.0')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('docs', app, document);

  const port = process.env.API_PORT || 3001;

  // Phase 13: Socket.IO Redis adapter (multi-instance broadcasts + restart-safe
  // presence). Must be set before listen(); best-effort — falls back to a
  // single-instance gateway if Redis is unavailable, never blocks bootstrap.
  const redisAdapter = new RedisIoAdapter(app, process.env.REDIS_URL);
  await redisAdapter.connectToRedis();
  app.useWebSocketAdapter(redisAdapter);

  console.log('[bootstrap] Before listen()');
  try {
    const server = await app.listen(port);
    console.log('[bootstrap] listen() returned - FIDScript API running on port', port);
  } catch (err) {
    console.error('[bootstrap] listen() threw:', err);
    process.exit(1);
  }
}
bootstrap();
