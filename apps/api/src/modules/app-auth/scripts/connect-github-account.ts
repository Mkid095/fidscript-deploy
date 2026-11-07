/**
 * Connect an operator's GitHub account to the platform.
 *
 * The dashboard does this with a personal access token
 * (`POST /api/v1/users/me/github/token`). This script does the same thing
 * from the server side, for the account that owns the platform — it is how
 * the person who installed the platform connects GitHub before anybody has
 * signed in to the dashboard.
 *
 * It goes through the real service, so the token is checked with GitHub and
 * stored encrypted, exactly as it would be through the API.
 *
 *   GITHUB_TOKEN=ghp_… node dist/modules/app-auth/scripts/connect-github-account.js admin@fidscript.com
 *
 * The token is read from the environment and is never printed, never written
 * to a log, and never returned.
 */
import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';

import { AppModule } from '../../../app.module';
import { UserGithubService } from '../services/user-github.service';
import { PrismaService } from '../../../prisma/prisma.service';

async function main(): Promise<void> {
  const email = process.argv[2];
  const token = process.env.GITHUB_TOKEN;
  if (!email || !token) {
    console.error(
      'Usage: GITHUB_TOKEN=<token> node dist/modules/app-auth/scripts/connect-github-account.js <email>',
    );
    process.exit(1);
  }

  // A full application, not an application context: the realtime gateway
  // expects an HTTP server to attach to, and an application context has none.
  // Nothing listens — the script does one thing and closes the application.
  const app = await NestFactory.create(AppModule, { logger: ['error', 'warn'] });
  // Nothing listens, so `init()` is what runs the lifecycle hooks — the
  // CryptoService loads its key in one, and without it nothing can be
  // encrypted or decrypted.
  await app.init();

  try {
    const prisma = app.get(PrismaService);
    const github = app.get(UserGithubService);

    const user = await prisma.user.findFirst({ where: { email } });
    if (!user) throw new Error(`No user with the email ${email}.`);

    const result = await github.connectWithToken(user.id, token);
    Logger.log(`GitHub connected for ${email} as ${result.username}`, 'ConnectGithub');
  } finally {
    // The application closes itself when the workers stop; this script has
    // nothing left to do, and the process is finished either way.
    await app.close().catch(() => undefined);
    process.exit(0);
  }
}

// Only when it is run, never when it is imported.
if (require.main === module) {
  main().catch((err: unknown) => {
    console.error(`Could not connect the account: ${(err as Error).message}`);
    process.exit(1);
  });
}
