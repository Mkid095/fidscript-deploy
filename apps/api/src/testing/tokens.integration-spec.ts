import { PrismaClient } from '@prisma/client';
import { startIntegrationTier, signIn, type IntegrationTier } from '@/testing/integration';
import { createUser, configurePlatform } from '@/testing/fixtures';

/**
 * The tokens.
 *
 * A refresh token is a credential for exactly one thing: getting a new
 * access token. It was accepted as a bearer token on every route, and it
 * survived the logout that was meant to end it.
 */
describe('the tokens', () => {
  let tier: IntegrationTier;
  let prisma: PrismaClient;

  beforeAll(async () => {
    tier = await startIntegrationTier();
    prisma = tier.prisma;
  }, 180000);

  afterAll(async () => {
    await tier.close();
  });

    it('refuses a refresh token used as an access token', async () => {
      const owner = await createUser(prisma);
      await signIn(tier.url, owner.email, owner.password);

      const session = await prisma.session.findFirst({ where: { userId: owner.id } });
      expect(session).not.toBeNull();

      // A refresh token is a credential for exactly one thing: getting a
      // new access token.
      const jwt = require('jsonwebtoken');
      const refresh = jwt.sign(
        {
          sub: owner.id,
          email: owner.email,
          role: owner.role,
          type: 'refresh',
          sessionId: session!.id,
        },
        process.env.JWT_SECRET,
        { expiresIn: '1h' },
      );

      const response = await fetch(`${tier.url}/api/v1/auth/me`, {
        headers: { Authorization: `Bearer ${refresh}` },
      });
      expect(response.status).toBe(401);
    });

    it('stops the token working when the person signs out', async () => {
      const owner = await createUser(prisma);
      const token = await signIn(tier.url, owner.email, owner.password);

      const before = await fetch(`${tier.url}/api/v1/auth/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      expect(before.status).toBe(200);

      const session = await prisma.session.findFirst({ where: { userId: owner.id } });
      const out = await fetch(`${tier.url}/api/v1/auth/logout`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      expect([200, 201]).toContain(out.status);

      const after = await fetch(`${tier.url}/api/v1/auth/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      expect(after.status).toBe(401);
      expect(session).not.toBeNull();
    });
  });
