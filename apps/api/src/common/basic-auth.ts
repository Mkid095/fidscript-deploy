/**
 * Build an HTTP Basic auth header value from a username + password.
 * ponytail: replaces 5 hand-rolled `Buffer.from(`${u}:${p}`).toString('base64')` sites
 * scattered across the email module.
 */
export function basicAuthHeader(user: string, pass: string): string {
  return `Basic ${Buffer.from(`${user}:${pass}`).toString('base64')}`;
}
