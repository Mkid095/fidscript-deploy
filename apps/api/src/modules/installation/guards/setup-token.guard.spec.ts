import { ExecutionContext, ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { SetupTokenGuard } from './setup-token.guard';

/**
 * The setup routes, tested.
 *
 * `POST /installation/configure` writes the platform's administrator, its
 * routing and its DNS credentials. It had no guard at all, so an anonymous
 * caller could install themselves as the platform's administrator.
 */

const TOKEN = 'the-setup-token-the-installer-printed';

function makeGuard(options: { lifecycle?: string; token?: string | null } = {}) {
  const prisma = {
    installationStatus: {
      findFirst: jest.fn(async () => ({
        lifecycle: options.lifecycle ?? 'UNCONFIGURED',
      })),
    },
  };
  const config = {
    get: jest.fn((_key: string, fallback: string) =>
      options.token === null ? '/nonexistent/setup-token.txt' : '/tmp/setup-token.txt',
    ),
  };
  // The guard reads the token from a file; the file is stubbed here.
  const fs = require('fs');
  const existsSync = jest.spyOn(fs, 'existsSync').mockReturnValue(options.token !== null);
  const readFileSync = jest.spyOn(fs, 'readFileSync').mockReturnValue(TOKEN);

  const guard = new SetupTokenGuard(config as any, prisma as any);
  return { guard, prisma, existsSync, readFileSync };
}

function makeContext(token?: string): ExecutionContext {
  return {
    switchToHttp: () => ({
      getRequest: () => ({ headers: token ? { 'x-setup-token': token } : {} }),
    }),
  } as unknown as ExecutionContext;
}

describe('SetupTokenGuard', () => {
  afterEach(() => jest.restoreAllMocks());

  it('lets a caller with the token configure a platform that is not configured yet', async () => {
    const { guard } = makeGuard();
    await expect(guard.canActivate(makeContext(TOKEN))).resolves.toBe(true);
  });

  it('refuses a caller without the token', async () => {
    const { guard } = makeGuard();
    await expect(guard.canActivate(makeContext())).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('refuses a caller with the wrong token', async () => {
    const { guard } = makeGuard();
    await expect(guard.canActivate(makeContext('not-the-token'))).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });

  it('refuses a platform that is ALREADY configured — the setup is closed', async () => {
    const { guard } = makeGuard({ lifecycle: 'CONFIGURED' });
    await expect(guard.canActivate(makeContext(TOKEN))).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });

  it('fails closed when the platform has no setup token at all', async () => {
    const { guard } = makeGuard({ token: null });
    await expect(guard.canActivate(makeContext(TOKEN))).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });
});
