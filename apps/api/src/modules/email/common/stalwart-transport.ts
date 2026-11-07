/**
 * Build a nodemailer transporter for Stalwart SMTP submission.
 * ponytail: replaces duplicated transporter builders in SmtpSendService + PlatformMailService.
 * Different callers need different auth user/pass and timeouts — caller passes opts.
 *
 * 2026-06-27 — SMTP "Greeting never received" diagnostic fixes:
 * - Log the actual resolved nodemailer version + transport options (host, port, secure,
 *   greetingTimeout, connectionTimeout, socketTimeout, tls) so we can verify what is
 *   actually being sent to Stalwart instead of guessing.
 * - Enable `logger: true` (nodemailer prints the SMTP transcript) so the failure
 *   mode is visible: "Connection closed", "Timeout", "Greeting never received",
 *   "AUTH failed", etc. **`debug` is off**: with it on, nodemailer prints the
 *   AUTH line, which carries the credential.
 * - Default greeting/connection/socket timeouts to 30s (Stalwart responses on the
 *   internal docker network should be sub-second; the long timeout is insurance, not
 *   the root cause, but eliminates "default 30s timeout fired before the greeting
 *   arrived" as a possible contributor).
 * - Keep `tls.rejectUnauthorized: false` — Stalwart's submissions listener serves the
 *   auto-generated self-signed cert; we verified (via a clean Node probe) that the TLS
 *   handshake on :465 succeeds with this flag, and that the SMTP 220 greeting is
 *   actually sent. The previous "Greeting never received" was a probe bug, not a
 *   server bug. So the real failure is downstream of the TLS handshake — most likely
 *   a nodemailer version/option interaction we want the debug log to reveal.
 */
import nodemailer, { type Transporter } from 'nodemailer';

const NM_VERSION: string = (() => {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    return require('nodemailer/package.json').version as string;
  } catch {
    return 'unknown';
  }
})();

export interface StalwartTransportOpts {
  host: string;
  port: number;
  user: string;
  pass: string;
  connectionTimeoutMs?: number;
  greetingTimeoutMs?: number;
  socketTimeoutMs?: number;
}

export async function createStalwartTransport(opts: StalwartTransportOpts): Promise<Transporter> {
  const connectionTimeout = opts.connectionTimeoutMs ?? 30_000;
  const greetingTimeout = opts.greetingTimeoutMs ?? 30_000;
  const socketTimeout = opts.socketTimeoutMs ?? 30_000;
  const transportOpts = {
    host: opts.host,
    port: opts.port,
    secure: Number(opts.port) === 465,
    auth: { user: opts.user, pass: opts.pass },
    tls: { rejectUnauthorized: false },
    connectionTimeout,
    greetingTimeout,
    socketTimeout,
    // The SMTP transcript goes to the log so a failure is visible. It is
    // written by nodemailer's own logger, which redacts the credentials it
    // sends — the debug flag below is what makes nodemailer print them, so
    // it is off.
    logger: true,
    debug: false,
  };
  // The diagnostic line names the transport WITHOUT its credential. It used
  // to print the whole options object, `auth.pass` included, so the mail
  // server's admin password was written to the API log in the clear on
  // every message the platform sent.
  // eslint-disable-next-line no-console
  console.log(
    '[stalwart-transport] nodemailer version', NM_VERSION,
    'options', JSON.stringify({ ...transportOpts, auth: { user: opts.user, pass: '«redacted»' } }),
  );
  return nodemailer.createTransport(transportOpts);
}
