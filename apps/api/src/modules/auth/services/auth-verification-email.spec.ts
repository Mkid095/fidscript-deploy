import { Test } from '@nestjs/testing';

import { AuthVerificationEmailService } from './auth-verification-email';

/**
 * The links the verification emails carry.
 *
 * They used to point at `${APP_URL}/auth/reset-password` — a page that does
 * not exist. The reset email led to a 404, so the whole recovery flow was a
 * dead end, and the person could not get back into their account.
 */
describe('AuthVerificationEmailService', () => {
  async function makeService(env: Record<string, string | undefined>) {
    const config = { get: (key: string) => env[key] };
    const moduleRef = await Test.createTestingModule({
      providers: [
        AuthVerificationEmailService,
        { provide: require('@nestjs/config').ConfigService, useValue: config },
      ],
    }).compile();
    return moduleRef.get(AuthVerificationEmailService);
  }

  it('points the reset at the reset screen', async () => {
    const service = await makeService({ APP_URL: 'https://fidscript.com' });
    expect(service.linkFor('PASSWORD_RESET', 'abc')).toBe(
      'https://fidscript.com/reset-password?token=abc',
    );
  });

  it('points the verification at the verification screen', async () => {
    const service = await makeService({ APP_URL: 'https://fidscript.com' });
    expect(service.linkFor('EMAIL_VERIFY', 'abc')).toBe(
      'https://fidscript.com/verify-email?token=abc',
    );
  });

  it('points the sign-in link at the magic-link screen', async () => {
    const service = await makeService({ APP_URL: 'https://fidscript.com' });
    expect(service.linkFor('MAGIC_LINK', 'abc')).toBe(
      'https://fidscript.com/magic-link?token=abc',
    );
  });

  it('falls back to the platform domain', async () => {
    const service = await makeService({ PLATFORM_DOMAIN: 'fidscript.com' });
    expect(service.linkFor('PASSWORD_RESET', 'abc')).toContain('https://fidscript.com/reset-password');
  });

  it('encodes the token', async () => {
    const service = await makeService({ APP_URL: 'https://fidscript.com' });
    expect(service.linkFor('PASSWORD_RESET', 'a b&c')).toContain('token=a%20b%26c');
  });

  it('puts the link in the body of the mail', async () => {
    const service = await makeService({ APP_URL: 'https://fidscript.com' });
    const mail = service.build('PASSWORD_RESET', 'abc', '1 hour');
    expect(mail.text).toContain('https://fidscript.com/reset-password?token=abc');
    expect(mail.html).toContain('https://fidscript.com/reset-password?token=abc');
    expect(mail.subject).toContain('password');
  });
});
