/**
 * Boot hooks. The one thing that must exist before a sign-in can happen:
 * the platform admin. Created from the env on first boot; if the password
 * was not set, a generated one is logged exactly once.
 */
export async function register() {
  // eslint-disable-next-line no-console
  console.log('[webmail] instrumentation register() fired',
    'runtime=', process.env.NEXT_RUNTIME, 'env=', process.env.NODE_ENV);
  if (process.env.NEXT_RUNTIME === 'node') {
    try {
      const { db } = await import('@/lib/db');
      const { ensurePlatformAdmin } = await import('@/lib/auth/session');
      await db.$connect();
      const admin = await ensurePlatformAdmin();
      if (admin.generatedPassword) {
        // eslint-disable-next-line no-console
        console.log(
          `[webmail] created the platform admin ${admin.email} with the generated password ` +
            `${admin.generatedPassword} — set WEBMAIL_ADMIN_PASSWORD to make it stable.`,
        );
      }
    } catch (err) {
      // The database may not exist yet (before first migration); the next
      // boot retries. Nothing else at boot is required to serve the pages.
      // eslint-disable-next-line no-console
      console.error('[webmail] boot hook skipped:', (err as Error).message);
    }
  }
}
