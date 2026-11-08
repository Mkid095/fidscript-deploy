/**
 * Server-side startup.
 *
 * The console's server components fetch the platform's own applications
 * (the registry, the API) over their public names. Inside a container
 * those names resolve to IPv6 first, and a container without an IPv6
 * route times out on every such fetch — so the DNS answer order is set to
 * IPv4 first, before anything has a chance to fetch.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const dns = await import('dns');
    dns.setDefaultResultOrder('ipv4first');
  }
}
