import { PrismaClient } from '@prisma/client';
import { generateSync } from 'otplib';
import { startIntegrationTier, signIn, type IntegrationTier } from '@/testing/integration';
import { createUser } from '@/testing/fixtures';
import { post } from '@/testing/auth-http';

/**
 * The second factor, against the running platform.
 *
 * An account with MFA on used to be unable to sign in at all: the API
 * answered with a challenge instead of tokens, and the client threw the
 * challenge away. The whole path is exercised here over HTTP — enroll,
 * challenge, recover, disable.
 */
describe('the second factor', () => {
  let tier: IntegrationTier;
  let prisma: PrismaClient;

  beforeAll(async () => {
    tier = await startIntegrationTier();
    prisma = tier.prisma;
  }, 180000);

  afterAll(async () => {
    await tier.close();
  });


  describe('the second factor', () => {
    async function enroll() {
      const user = await createUser(prisma);
      const token = await signIn(tier.url, user.email, user.password);

      const setup = await post(tier, '/auth/mfa/setup', {}, token);
      expect(setup.status).toBe(201);
      const secret = setup.json.secret as string;

      const code = generateSync({ secret });
      const verify = await post(tier, '/auth/mfa/verify', { code }, token);
      expect(verify.status).toBe(200);
      expect(verify.json.enabled).toBe(true);

      return { user, token, secret };
    }

    it('turns on', async () => {
      const { token } = await enroll();
      const status = await fetch(`${tier.url}/api/v1/auth/mfa/status`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const body = (await status.json()) as { enabled: boolean };
      expect(body.enabled).toBe(true);
    });

    it('stops the sign-in at a challenge instead of giving tokens away', async () => {
      const { user } = await enroll();
      const res = await post(tier, '/auth/login', { email: user.email, password: user.password });
      expect(res.status).toBe(200);
      expect(res.json.mfaRequired).toBe(true);
      expect(res.json.mfaToken).toBeTruthy();
      // The whole point: no tokens before the second factor.
      expect(res.json.accessToken).toBeUndefined();
    });

    it('finishes the sign-in with the code from the authenticator', async () => {
      const { user, secret } = await enroll();
      const login = await post(tier, '/auth/login', { email: user.email, password: user.password });
      const challenge = await post(tier, '/auth/mfa/challenge', {
        mfaToken: login.json.mfaToken,
        code: generateSync({ secret }),
      });
      expect(challenge.status).toBe(200);
      expect(challenge.json.accessToken).toBeTruthy();
      expect(challenge.json.refreshToken).toBeTruthy();
    });

    it('refuses a wrong code', async () => {
      const { user } = await enroll();
      const login = await post(tier, '/auth/login', { email: user.email, password: user.password });
      const challenge = await post(tier, '/auth/mfa/challenge', {
        mfaToken: login.json.mfaToken,
        code: '000000',
      });
      expect(challenge.status).toBe(401);
    });

    it('refuses a challenge that was not issued here', async () => {
      const challenge = await post(tier, '/auth/mfa/challenge', {
        mfaToken: 'not-a-real-challenge',
        code: '123456',
      });
      expect(challenge.status).toBe(401);
    });

    it('lets a recovery code in, and uses it up', async () => {
      const { user, token } = await enroll();

      const codes = await post(tier, '/auth/mfa/recovery-codes', {}, token);
      expect(codes.status).toBe(200);
      expect(codes.json.codes).toHaveLength(10);

      const login = await post(tier, '/auth/login', { email: user.email, password: user.password });
      const challenge = await post(tier, '/auth/mfa/challenge', {
        mfaToken: login.json.mfaToken,
        code: codes.json.codes[0],
      });
      expect(challenge.status).toBe(200);
      expect(challenge.json.accessToken).toBeTruthy();

      // The same code does not work twice.
      const second = await post(tier, '/auth/login', { email: user.email, password: user.password });
      const replay = await post(tier, '/auth/mfa/challenge', {
        mfaToken: second.json.mfaToken,
        code: codes.json.codes[0],
      });
      expect(replay.status).toBe(401);
    });

    it('counts the recovery codes that are left', async () => {
      const { token } = await enroll();
      await post(tier, '/auth/mfa/recovery-codes', {}, token);
      const status = await fetch(`${tier.url}/api/v1/auth/mfa/status`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const body = (await status.json()) as { recoveryCodesRemaining: number };
      expect(body.recoveryCodesRemaining).toBe(10);
    });

    it('turns off with the password, and then signs in normally', async () => {
      const { user, token } = await enroll();

      const refused = await post(tier, '/auth/mfa/disable', { password: 'not-the-password' }, token);
      expect(refused.status).toBe(401);

      const disabled = await post(tier, '/auth/mfa/disable', { password: user.password }, token);
      expect(disabled.status).toBe(200);

      const login = await post(tier, '/auth/login', { email: user.email, password: user.password });
      expect(login.json.accessToken).toBeTruthy();
      expect(login.json.mfaRequired).toBeUndefined();
    });

    it('will not replace a secret that is already in use', async () => {
      const { token } = await enroll();
      const again = await post(tier, '/auth/mfa/setup', {}, token);
      expect(again.status).toBe(400);
    });
  });

});
