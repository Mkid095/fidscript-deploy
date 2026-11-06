import { PrismaClient } from '@prisma/client';
import { startTestApp, type TestApp } from './test-app';
import { configurePlatform } from './fixtures';

/**
 * What an integration test needs.
 *
 * The **real** application, over HTTP, against the tier's own database. The
 * database is created and dropped by `scripts/test-integration.sh`; the
 * suite only connects to it.
 */
export interface IntegrationTier {
  /** The address the application answers on. */
  url: string;
  /** A client for the tier's own database. */
  prisma: PrismaClient;
  /** Release the application and the connection. */
  close: () => Promise<void>;
}

/** Boot the application and the database client for a suite. */
export async function startIntegrationTier(): Promise<IntegrationTier> {
  const app: TestApp = await startTestApp();
  const prisma = new PrismaClient({ datasources: { db: { url: process.env.DATABASE_URL } } });
  // The sign-in is closed until the platform has been set up.
  await configurePlatform(prisma);
  return {
    url: app.url,
    prisma,
    close: async () => {
      await app.close();
      await prisma.$disconnect();
    },
  };
}

/** Sign a person in and return their bearer token. */
export async function signIn(url: string, email: string, password: string): Promise<string> {
  const response = await fetch(`${url}/api/v1/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  if (response.status !== 200) {
    throw new Error(`The sign-in was refused: ${response.status} ${await response.text()}`);
  }
  return ((await response.json()) as { accessToken: string }).accessToken;
}
