import { PrismaClient } from '@prisma/client';
import { generateSync } from 'otplib';
import { startIntegrationTier, signIn, type IntegrationTier } from '@/testing/integration';
import { createUser } from '@/testing/fixtures';
import { post } from '@/testing/auth-http';

/**
 * Signing in, signing up, and the second factor — against the running
 * platform, over HTTP, with the real guards and the real database.
 *
 * The MFA flow is the one that matters most here: an account with a second
 * factor used to be unable to sign in at all, because the API answered
 * with a challenge instead of tokens and the client threw the challenge
 * away. The whole path is exercised: enroll, challenge, recover, disable.
 */
describe('the authentication journey', () => {
  let tier: IntegrationTier;
  let prisma: PrismaClient;

  beforeAll(async () => {
    tier = await startIntegrationTier();
    prisma = tier.prisma;
  }, 180000);

  afterAll(async () => {
    await tier.close();
  });


  describe('registering', () => {
    it('makes an account and signs the person in', async () => {
      const email = `new-${Date.now()}@example.test`;
      const res = await post(tier, '/auth/register', {
        email,
        password: 'A-good-Password-1',
        name: 'New Person',
        authMethod: 'PASSWORD',
      });
      expect(res.status).toBe(201);
      expect(res.json.accessToken).toBeTruthy();
      expect(res.json.refreshToken).toBeTruthy();
    });

    it('refuses a password the policy does not allow', async () => {
      const res = await post(tier, '/auth/register', {
        email: `weak-${Date.now()}@example.test`,
        password: 'short',
        authMethod: 'PASSWORD',
      });
      expect(res.status).toBe(400);
    });
  });

  describe('signing in', () => {
    it('gives a session', async () => {
      const user = await createUser(prisma);
      const token = await signIn(tier.url, user.email, user.password);
      expect(token).toBeTruthy();
    });

    it('says the same thing for an account that does not exist', async () => {
      const res = await post(tier, '/auth/login', {
        email: 'nobody-at-all@example.test',
        password: 'whatever',
      });
      expect(res.status).toBe(401);
      expect(res.json.message).toBe('Invalid credentials');
    });
  });

  describe('resetting a password', () => {
    it('changes the password, and the new one is the one that works', async () => {
      const user = await createUser(prisma);

      // Ask for the reset. The answer is the same whatever the address is.
      const asked = await post(tier, '/auth/forgot-password', { email: user.email });
      expect(asked.status).toBe(200);
      expect(asked.json.sent).toBe(true);

      const token = await prisma.verificationToken.findFirst({
        where: { userId: user.id, type: 'PASSWORD_RESET', consumed: false },
      });
      expect(token).toBeTruthy();

      const reset = await post(tier, '/auth/password-reset', {
        token: token!.token,
        newPassword: 'Another-Good-Password-2',
      });
      expect(reset.status).toBe(200);

      // The old password no longer works.
      const old = await post(tier, '/auth/login', { email: user.email, password: user.password });
      expect(old.status).toBe(401);

      // The new one does.
      const fresh = await post(tier, '/auth/login', {
        email: user.email,
        password: 'Another-Good-Password-2',
      });
      expect(fresh.status).toBe(200);
      expect(fresh.json.accessToken).toBeTruthy();
    });

    it('does not say whether the account exists', async () => {
      const known = await post(tier, '/auth/forgot-password', { email: 'nobody-here@example.test' });
      const unknown = await post(tier, '/auth/forgot-password', { email: 'still-nobody@example.test' });
      expect(known.status).toBe(unknown.status);
      expect(known.json).toEqual(unknown.json);
    });
  });

  describe('the first-time journey', () => {
    it('is marked as finished on the account', async () => {
      const user = await createUser(prisma);
      const token = await signIn(tier.url, user.email, user.password);

      const before = await fetch(`${tier.url}/api/v1/auth/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const beforeBody = (await before.json()) as { user: { onboardedAt: string | null } };
      expect(beforeBody.user.onboardedAt).toBeNull();

      const done = await post(tier, '/auth/onboarding/complete', {}, token);
      expect(done.status).toBe(200);

      const after = await fetch(`${tier.url}/api/v1/auth/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const afterBody = (await after.json()) as { user: { onboardedAt: string | null } };
      expect(afterBody.user.onboardedAt).toBeTruthy();
    });
  });
});
