/**
 * Server-side startup.
 *
 * Two things the process does before it answers anyone.
 *
 * The console's server components fetch the platform's own applications
 * (the registry, the API) over their own addresses. Inside a container the
 * public names resolve to IPv6 first, and a container without an IPv6 route
 * times out on every such fetch — so the DNS answer order is set to IPv4
 * first, before anything has a chance to fetch.
 *
 * And the package registry's catalogue is asked for now: its first answer
 * takes a quarter of a minute on this machine, so the one who starts the
 * server is the one who waits for it — no person's page does.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const dns = await import('dns');
    dns.setDefaultResultOrder('ipv4first');

    const { warmRegistryCatalogue } = await import('./lib/api/packages');
    warmRegistryCatalogue();
  }
}
