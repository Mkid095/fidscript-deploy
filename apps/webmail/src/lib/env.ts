/**
 * The application's configuration, read once, named for what it is.
 *
 * Every value has a documented default in .env.example. Nothing here is
 * secret-safe — these read process.env directly; the Docker entrypoint
 * injects the secret from the mounted file.
 */

/** The Stalwart HTTP root (its JMAP + admin listener). No trailing slash. */
export function stalwartUrl(): string {
  const raw = process.env.STALWART_URL ?? 'http://fidscript_stalwart:8080';
  return raw.replace(/\/+$/, '');
}

/** The Stalwart recovery-admin credential — server-side only. */
export function stalwartAdmin(): { user: string; pass: string } {
  const user = process.env.STALWART_ADMIN_USER ?? '';
  const pass =
    process.env.STALWART_ADMIN_PASSWORD ??
    process.env.STALWART_ADMIN_TOKEN ??
    '';
  return { user, pass };
}

export function stalwartConfigured(): boolean {
  const { user, pass } = stalwartAdmin();
  return user.length > 0 && pass.length > 0;
}

/** Where the application answers. */
export function baseUrl(): string {
  return process.env.WEBMAIL_BASE_URL ?? 'http://localhost:3100';
}
