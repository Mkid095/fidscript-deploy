import { AuthMagicCodeService } from './auth-magic-code.service';
import { createStalwartTransport } from '@/modules/email/common/stalwart-transport';

/**
 * Secrets do not belong in a log.
 *
 * Two of them were there. The mail server's admin password was printed with
 * the transport options on every message the platform sent, and the login
 * code was printed next to the address it was sent to — so anyone who could
 * read the API log could sign in as that person.
 */

describe('the log', () => {
  const written: string[] = [];
  let consoleLog: jest.SpyInstance;

  beforeEach(() => {
    written.length = 0;
    consoleLog = jest.spyOn(console, 'log').mockImplementation((...args: unknown[]) => {
      written.push(args.map(String).join(' '));
    });
  });

  afterEach(() => {
    consoleLog.mockRestore();
  });

  it('never carries the mail server\'s password', async () => {
    const password = 'the-mail-password-that-must-not-be-logged';
    await createStalwartTransport({
      host: 'stalwart',
      port: 465,
      user: 'admin',
      pass: password,
    });
    expect(written.join('\n')).not.toContain(password);
    // The diagnostic line is still there — it is useful.
    expect(written.join('\n')).toContain('stalwart-transport');
  });

  it('never carries a login code', async () => {
    const prisma = {
      user: { findUnique: jest.fn(async () => ({ id: 'user-1', email: 'a@b.c' })) },
      magicCode: { create: jest.fn(async () => ({})) },
    };
    const eventService = { emit: jest.fn(async () => undefined) };
    const rateLimiter = { consume: jest.fn(async () => ({ allowed: true, remaining: 10 })) };
    const session = { createSession: jest.fn(async () => ({ accessToken: 'a', refreshToken: 'r', expiresIn: 900 })) };
    const mail = { send: jest.fn(async () => ({ status: 'sent' })) };

    const service = new AuthMagicCodeService(
      prisma as any,
      eventService as any,
      rateLimiter as any,
      session as any,
      mail as any,
    );

    // The code the service generated is what must not reach the log.
    const generated = jest.spyOn(service as any, 'generateCode').mockReturnValue('424242');

    const logged: string[] = [];
    const logger = (service as any).logger;
    const original = logger.log.bind(logger);
    logger.log = (...args: unknown[]) => {
      logged.push(args.map(String).join(' '));
      original(...args);
    };

    await service.requestCode({ email: 'a@b.c' });

    expect(generated).toHaveBeenCalled();
    expect(logged.join('\n')).not.toContain('424242');
    // It still says that a code was issued.
    expect(logged.join('\n')).toContain('a@b.c');
  });
});
