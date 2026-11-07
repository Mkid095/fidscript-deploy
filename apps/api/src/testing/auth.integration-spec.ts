import { PrismaClient } from '@prisma/client';
import { generateSync } from 'otplib';
import { startIntegrationTier, signIn, type IntegrationTier } from '@/testing/integration';
import { createUser } from '@/testing/fixtures';

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

  async function post(path: string, body: unknown, token?: string) {
    const response = await fetch(`${tier.url}/api/v1${path}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(body),
    });
    const text = await response.text();
    let json: unknown = null;
    try {
      json = text ? JSON.parse(text) : null;
    } catch {
      json = text;
    }
    return { status: response.status, json: json as any };
  }

  describe('registering', () => {
    it('makes an account and signs the person in', async () => {
      const email = `new-${Date.now()}@example.test`;
      const res = await post('/auth/register', {
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
      const res = await post('/auth/register', {
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
      const res = await post('/auth/login', {
        email: 'nobody-at-all@example.test',
        password: 'whatever',
      });
      expect(res.status).toBe(401);
      expect(res.json.message).toBe('Invalid credentials');
    });
  });

  describe('the second factor', () => {
    async function enroll() {
      const user = await createUser(prisma);
      const token = await signIn(tier.url, user.email, user.password);

      const setup = await post('/auth/mfa/setup', {}, token);
      expect(setup.status).toBe(201);
      const secret = setup.json.secret as string;

      const code = generateSync({ secret });
      const verify = await post('/auth/mfa/verify', { code }, token);
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
      const res = await post('/auth/login', { email: user.email, password: user.password });
      expect(res.status).toBe(200);
      expect(res.json.mfaRequired).toBe(true);
      expect(res.json.mfaToken).toBeTruthy();
      // The whole point: no tokens before the second factor.
      expect(res.json.accessToken).toBeUndefined();
    });

    it('finishes the sign-in with the code from the authenticator', async () => {
      const { user, secret } = await enroll();
      const login = await post('/auth/login', { email: user.email, password: user.password });
      const challenge = await post('/auth/mfa/challenge', {
        mfaToken: login.json.mfaToken,
        code: generateSync({ secret }),
      });
      expect(challenge.status).toBe(200);
      expect(challenge.json.accessToken).toBeTruthy();
      expect(challenge.json.refreshToken).toBeTruthy();
    });

    it('refuses a wrong code', async () => {
      const { user } = await enroll();
      const login = await post('/auth/login', { email: user.email, password: user.password });
      const challenge = await post('/auth/mfa/challenge', {
        mfaToken: login.json.mfaToken,
        code: '000000',
      });
      expect(challenge.status).toBe(401);
    });

    it('refuses a challenge that was not issued here', async () => {
      const challenge = await post('/auth/mfa/challenge', {
        mfaToken: 'not-a-real-challenge',
        code: '123456',
      });
      expect(challenge.status).toBe(401);
    });

    it('lets a recovery code in, and uses it up', async () => {
      const { user, token } = await enroll();

      const codes = await post('/auth/mfa/recovery-codes', {}, token);
      expect(codes.status).toBe(200);
      expect(codes.json.codes).toHaveLength(10);

      const login = await post('/auth/login', { email: user.email, password: user.password });
      const challenge = await post('/auth/mfa/challenge', {
        mfaToken: login.json.mfaToken,
        code: codes.json.codes[0],
      });
      expect(challenge.status).toBe(200);
      expect(challenge.json.accessToken).toBeTruthy();

      // The same code does not work twice.
      const second = await post('/auth/login', { email: user.email, password: user.password });
      const replay = await post('/auth/mfa/challenge', {
        mfaToken: second.json.mfaToken,
        code: codes.json.codes[0],
      });
      expect(replay.status).toBe(401);
    });

    it('counts the recovery codes that are left', async () => {
      const { token } = await enroll();
      await post('/auth/mfa/recovery-codes', {}, token);
      const status = await fetch(`${tier.url}/api/v1/auth/mfa/status`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const body = (await status.json()) as { recoveryCodesRemaining: number };
      expect(body.recoveryCodesRemaining).toBe(10);
    });

    it('turns off with the password, and then signs in normally', async () => {
      const { user, token } = await enroll();

      const refused = await post('/auth/mfa/disable', { password: 'not-the-password' }, token);
      expect(refused.status).toBe(401);

      const disabled = await post('/auth/mfa/disable', { password: user.password }, token);
      expect(disabled.status).toBe(200);

      const login = await post('/auth/login', { email: user.email, password: user.password });
      expect(login.json.accessToken).toBeTruthy();
      expect(login.json.mfaRequired).toBeUndefined();
    });

    it('will not replace a secret that is already in use', async () => {
      const { token } = await enroll();
      const again = await post('/auth/mfa/setup', {}, token);
      expect(again.status).toBe(400);
    });
  });

  describe('resetting a password', () => {
    it('changes the password, and the new one is the one that works', async () => {
      const user = await createUser(prisma);

      // Ask for the reset. The answer is the same whatever the address is.
      const asked = await post('/auth/forgot-password', { email: user.email });
      expect(asked.status).toBe(200);
      expect(asked.json.sent).toBe(true);

      const token = await prisma.verificationToken.findFirst({
        where: { userId: user.id, type: 'PASSWORD_RESET', consumed: false },
      });
      expect(token).toBeTruthy();

      const reset = await post('/auth/password-reset', {
        token: token!.token,
        newPassword: 'Another-Good-Password-2',
      });
      expect(reset.status).toBe(200);

      // The old password no longer works.
      const old = await post('/auth/login', { email: user.email, password: user.password });
      expect(old.status).toBe(401);

      // The new one does.
      const fresh = await post('/auth/login', {
        email: user.email,
        password: 'Another-Good-Password-2',
      });
      expect(fresh.status).toBe(200);
      expect(fresh.json.accessToken).toBeTruthy();
    });

    it('does not say whether the account exists', async () => {
      const known = await post('/auth/forgot-password', { email: 'nobody-here@example.test' });
      const unknown = await post('/auth/forgot-password', { email: 'still-nobody@example.test' });
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

      const done = await post('/auth/onboarding/complete', {}, token);
      expect(done.status).toBe(200);

      const after = await fetch(`${tier.url}/api/v1/auth/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const afterBody = (await after.json()) as { user: { onboardedAt: string | null } };
      expect(afterBody.user.onboardedAt).toBeTruthy();
    });
  });
});
