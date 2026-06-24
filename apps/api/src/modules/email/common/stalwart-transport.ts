/**
 * Build a nodemailer transporter for Stalwart SMTP submission.
 * ponytail: replaces duplicated transporter builders in SmtpSendService + PlatformMailService.
 * Different callers need different auth user/pass and timeouts — caller passes opts.
 */
import type { Transporter } from 'nodemailer';

export interface StalwartTransportOpts {
  host: string;
  port: number;
  user: string;
  pass: string;
  /** Optional: connectionTimeout in ms. */
  connectionTimeoutMs?: number;
  /** Optional: greetingTimeout in ms. */
  greetingTimeoutMs?: number;
}

export async function createStalwartTransport(opts: StalwartTransportOpts): Promise<Transporter> {
  const { default: nodemailer } = await import('nodemailer');
  return nodemailer.createTransport({
    host: opts.host,
    port: opts.port,
    secure: opts.port === 465,
    auth: { user: opts.user, pass: opts.pass },
    // Internal hop to our own Stalwart over the docker network: Stalwart
    // presents a self-signed cert, which nodemailer would otherwise reject.
    // This is not a public relay — disable cert verification for the hop.
    tls: { rejectUnauthorized: false },
    ...(opts.connectionTimeoutMs ? { connectionTimeout: opts.connectionTimeoutMs } : {}),
    ...(opts.greetingTimeoutMs ? { greetingTimeout: opts.greetingTimeoutMs } : {}),
  });
}
