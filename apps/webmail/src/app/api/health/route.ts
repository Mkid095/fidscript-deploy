import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth/require';
import { admin } from '@/lib/stalwart/admin';
import { runHealthChecks, type HealthCheck } from '@/lib/health/checks';

/**
 * The mail-health report, admin-only.
 *
 *   GET /api/health                 — every domain the platform knows
 *   GET /api/health?domain=<name>   — one domain
 *
 * Each result is a check that touched the real world: a DNS lookup, a TLS
 * handshake, a blocklist query. The report says what is verified, what is
 * only observed, and what could not be determined — it does not flatter.
 */
export async function GET(request: Request) {
  const context = await requireAdmin(request);
  if (!context) {
    return NextResponse.json({ error: 'Admin sign-in required.' }, { status: 401 });
  }

  const only = new URL(request.url).searchParams.get('domain');
  let domains: Array<{ name: string; dkimSelectors: string[] }> = await admin.listDomains();
  if (only) domains = domains.filter((domain) => domain.name === only);

  // The submission endpoint to probe: the platform's SMTP host from env,
  // or the domain itself.
  const subHost = process.env.WEBMAIL_SMTP_SUBMISSION_HOST ?? '';
  const subPort = Number(process.env.WEBMAIL_SMTP_SUBMISSION_PORT ?? 465);

  const reports = await Promise.all(
    domains.map(async (domain) => {
      let checks: HealthCheck[];
      try {
        checks = await runHealthChecks({
          domain: domain.name,
          dkimSelectors: domain.dkimSelectors,
          submission: subHost ? { host: subHost, port: subPort } : undefined,
        });
      } catch (err) {
        checks = [
          {
            id: 'suite',
            name: 'Suite',
            category: 'infrastructure',
            status: 'unknown',
            source: 'verified',
            detail: `The check suite could not run: ${(err as Error).message}`,
          },
        ];
      }
      return { domain: domain.name, checks };
    }),
  );

  return NextResponse.json({ reports });
}
