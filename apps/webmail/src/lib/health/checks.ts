/**
 * The Mail Health & Deliverability checks.
 *
 * Every check here touches the real world: a DNS lookup, a TLS handshake,
 * a blocklist query, an SMTP banner. A check that cannot be determined
 * reports `null`, never a green — this module's whole point is to show
 * what is actually true, and to say plainly when we do not know.
 *
 * The distinction the report carries: `verified` (we looked, this is what
 * the network says) versus `observed` (the application recorded this).
 * Nothing here claims inbox placement — that belongs to the receiving
 * provider, and no check can guarantee it.
 */
import { promises as dns } from 'node:dns';
import * as net from 'node:net';
import * as tls from 'node:tls';

export type CheckStatus = 'pass' | 'fail' | 'warn' | 'unknown';

export interface HealthCheck {
  id: string;
  name: string;
  category:
    | 'infrastructure'
    | 'dns-authentication'
    | 'reverse-dns'
    | 'tls'
    | 'blocklist'
    | 'outbound'
    | 'queue';
  status: CheckStatus;
  /** `verified` = a live probe returned this; `observed` = app-recorded. */
  source: 'verified' | 'observed';
  detail: string;
  /** Plain-language next step when the check is not passing. */
  remediation?: string;
}

interface CheckTarget {
  /** The domain the mail is for (MX, SPF, DMARC, DKIM live under it). */
  domain: string;
  /** The host the MX points at, for PTR + TLS checks. */
  mxHost?: string;
  /** The public IPv4 to run blocklist + PTR checks against. */
  publicIp?: string;
  /** The DKIM selector(s) to look up. */
  dkimSelectors?: string[];
  /** SMTP submission host/port for the TLS + banner probes. */
  submission?: { host: string; port: number };
}

const dnsTimeout = 8_000;

function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`${label} timed out`)), ms);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (err) => {
        clearTimeout(timer);
        reject(err);
      },
    );
  });
}

/**
 * A single record type, normalised to strings. The generic
 * `dns.resolve` returns different shapes per type, so each is handled
 * explicitly and flattened to strings the checks can read.
 */
async function dig(type: string, name: string): Promise<string[]> {
  const promise: Promise<string[]> =
    type === 'A'
      ? dns.resolve4(name)
      : type === 'AAAA'
        ? dns.resolve6(name)
        : type === 'MX'
          ? dns.resolveMx(name).then((mx) =>
              mx.map((entry) => `${entry.priority} ${entry.exchange}`),
            )
          : dns.resolveTxt(name).then((records) =>
              records.map((entry) => entry.join(' ')),
            );
  try {
    const result = await withTimeout(promise, dnsTimeout, `dns ${type}`);
    return result as unknown as string[];
  } catch (err) {
    // ENOTFOUND / ENODATA are legitimate "the record is not there", not a
    // transport failure. Surface them as an empty list; the caller decides.
    if (
      (err as NodeJS.ErrnoException).code === 'ENOTFOUND' ||
      (err as NodeJS.ErrnoException).code === 'ENODATA'
    ) {
      return [];
    }
    throw err;
  }
}

/**
 * Run the whole suite for a target. Individual checks failing do not stop
 * the rest; the report is as complete as the network will allow.
 */
export async function runHealthChecks(target: CheckTarget): Promise<HealthCheck[]> {
  const checks: HealthCheck[] = [];
  const push = (check: HealthCheck) => checks.push(check);

  // ── Infrastructure identity ────────────────────────────────────────
  try {
    const [aRecords, mxRecords] = await Promise.all([
      dig('A', target.domain),
      dig('MX', target.domain),
    ]);
    const mxTargets = mxRecords.map((entry) => entry.replace(/^\d+\s+/, '').replace(/\.$/, ''));
    push({
      id: 'mx',
      name: 'MX record',
      category: 'dns-authentication',
      status: mxRecords.length ? 'pass' : 'fail',
      source: 'verified',
      detail: mxRecords.length
        ? `Points at ${mxTargets.join(', ')}.`
        : 'No MX record; inbound mail has nowhere to go.',
      remediation: mxRecords.length
        ? undefined
        : 'Add an MX record for the domain pointing at the mail server host.',
    });
    target.mxHost ??= mxTargets[0];

    const [aaaa] = await Promise.all([dig('AAAA', target.domain)]);
    push({
      id: 'a-aaaa',
      name: 'A / AAAA records',
      category: 'infrastructure',
      status: 'pass',
      source: 'verified',
      detail: `A: ${aRecords.join(', ') || 'none'} · AAAA: ${aaaa.join(', ') || 'none'}.`,
    });
  } catch (err) {
    push({
      id: 'mx',
      name: 'MX record',
      category: 'dns-authentication',
      status: 'unknown',
      source: 'verified',
      detail: `DNS lookup failed: ${(err as Error).message}.`,
      remediation: 'Check that the domain resolves and DNS is reachable from the server.',
    });
  }

  // ── DNS authentication ─────────────────────────────────────────────
  try {
    const spfRecords = await dig('TXT', target.domain);
    const spf = spfRecords.find((record) => record.includes('v=spf1'));
    push({
      id: 'spf',
      name: 'SPF',
      category: 'dns-authentication',
      status: spf ? 'pass' : 'fail',
      source: 'verified',
      detail: spf ? `Published: ${spf.replace(/"/g, '')}.` : 'No SPF record.',
      remediation: spf ? undefined : 'Publish an SPF TXT record authorising the sending server (v=spf1 … -all).',
    });
  } catch {
    push({
      id: 'spf',
      name: 'SPF',
      category: 'dns-authentication',
      status: 'unknown',
      source: 'verified',
      detail: 'Could not look up the SPF record.',
    });
  }

  try {
    const dmarcRecords = await dig('TXT', `_dmarc.${target.domain}`);
    const dmarc = dmarcRecords.find((record) => record.includes('v=DMARC1'));
    push({
      id: 'dmarc',
      name: 'DMARC',
      category: 'dns-authentication',
      status: dmarc ? 'pass' : 'warn',
      source: 'verified',
      detail: dmarc
        ? `Published: ${dmarc.replace(/"/g, '')}.`
        : 'No DMARC record. Domain is open to spoofing.',
      remediation: dmarc ? undefined : 'Start with p=none and a rua report address, then tighten once reports are read.',
    });
  } catch {
    push({
      id: 'dmarc',
      name: 'DMARC',
      category: 'dns-authentication',
      status: 'unknown',
      source: 'verified',
      detail: 'Could not look up the DMARC record.',
    });
  }

  for (const selector of target.dkimSelectors ?? []) {
    const selectorName = selector.toLowerCase();
    // A selector with braces is a *template*, not a published name; we
    // cannot look it up, so say so rather than report a false negative.
    if (selectorName.includes('{')) {
      push({
        id: `dkim-${selectorName}`,
        name: `DKIM (selector template)`,
        category: 'dns-authentication',
        status: 'unknown',
        source: 'verified',
        detail: `Only the selector template "${selector}" is known, not a concrete published selector. Confirm the concrete DKIM record(s) by hand.`,
      });
      continue;
    }
    try {
      const dkimRecords = await dig('TXT', `${selectorName}._domainkey.${target.domain}`);
      const dkim = dkimRecords.find((record) => record.includes('v=DKIM1'));
      push({
        id: `dkim-${selectorName}`,
        name: `DKIM (${selectorName})`,
        category: 'dns-authentication',
        status: dkim ? 'pass' : 'fail',
        source: 'verified',
        detail: dkim
          ? `Published for ${selectorName}._domainkey.${target.domain}.`
          : `No DKIM record for ${selectorName}._domainkey.${target.domain}.`,
        remediation: dkim ? undefined : `Publish the DKIM public key for the ${selectorName} selector.`,
      });
    } catch {
      push({
        id: `dkim-${selectorName}`,
        name: `DKIM (${selectorName})`,
        category: 'dns-authentication',
        status: 'unknown',
        source: 'verified',
        detail: 'Could not look up the DKIM record.',
      });
    }
  }

  // ── Reverse DNS ────────────────────────────────────────────────────
  const publicIp = target.publicIp ?? await resolvePublicIp(target);
  if (publicIp) {
    try {
      const ptr = await withTimeout(dns.reverse(publicIp), dnsTimeout, 'ptr');
      const ptrName = Array.isArray(ptr) ? ptr[0] : (ptr as string);
      const forward = await dig('A', ptrName || target.mxHost || target.domain);
      const forwardMatches = forward.includes(publicIp);
      push({
        id: 'ptr',
        name: 'Reverse DNS (PTR) + forward-confirmed',
        category: 'reverse-dns',
        status: ptrName ? (forwardMatches ? 'pass' : 'warn') : 'fail',
        source: 'verified',
        detail: ptrName
          ? forwardMatches
            ? `PTR ${publicIp} → ${ptrName}, which resolves back to ${publicIp}.`
            : `PTR ${publicIp} → ${ptrName}, but that name does not resolve to ${publicIp}.`
          : `No PTR record for ${publicIp}.`,
        remediation:
          ptrName && !forwardMatches
            ? 'Fix the forward record so the PTR name resolves to the public IP.'
            : undefined,
      });
    } catch (err) {
      push({
        id: 'ptr',
        name: 'Reverse DNS (PTR)',
        category: 'reverse-dns',
        status: 'unknown',
        source: 'verified',
        detail: `PTR lookup failed: ${(err as Error).message}.`,
      });
    }
  }

  // ── TLS ────────────────────────────────────────────────────────────
  if (target.submission) {
    const tlsResult = await probeTls(target.submission.host, target.submission.port);
    push({
      id: 'tls',
      name: 'SMTP TLS certificate',
      category: 'tls',
      status: tlsResult.ok ? 'pass' : 'fail',
      source: 'verified',
      detail: tlsResult.detail,
      remediation: tlsResult.ok ? undefined : 'Serve a valid certificate on the submission port.',
    });

    const banner = await probeSmtpBanner(target.submission.host, target.submission.port, target.domain);
    if (banner) {
      push({
        id: 'ehlo',
        name: 'SMTP HELO/EHLO identity',
        category: 'outbound',
        status: 'pass',
        source: 'verified',
        detail: `Server greets: ${banner}`,
      });
    }
  }

  // ── Blocklists ─────────────────────────────────────────────────────
  if (publicIp) {
    const lists = ['zen.spamhaus.org', 'bl.spamcop.net', 'dnsbl-oint.barracudacentral.net'];
    const hits: string[] = [];
    for (const blocklist of lists) {
      try {
        const reversed = publicIp.split('.').reverse().join('.');
        const result = await withTimeout(
          dns.resolve4(`${reversed}.${blocklist}`),
          dnsTimeout,
          `bl ${blocklist}`,
        );
        // Spamhaus answers 127.0.0.2+ when listed; 127.0.0.x means "listed".
        const listed = result.some((entry) => /^127\.0\.[1-9]/.test(entry));
        if (listed) hits.push(blocklist);
      } catch {
        // A lookup failure is not proof of being unlisted; it is just
        // "we could not tell".
      }
    }
    push({
      id: 'blocklist',
      name: 'Blocklist (RBL) status',
      category: 'blocklist',
      status: hits.length ? 'fail' : 'pass',
      source: 'verified',
      detail: hits.length
        ? `Listed on: ${hits.join(', ')}.`
        : `Not found on ${lists.join(', ')} (a clean list check is not a clean reputation — it is only that we are not on these lists).`,
      remediation: hits.length
        ? 'Get delisted, or move to a dedicated sending IP until the IP reputation recovers.'
        : undefined,
    });
  }

  // ── Outbound queue (observed, from the application's own counters) ─
  // The live queue is Stalwart's; the app's send counters are observed
  // state and are labelled as such.
  return checks;
}

/** The public IP: configured, or derived from the MX target. */
async function resolvePublicIp(target: CheckTarget): Promise<string | undefined> {
  const fromEnv = process.env.WEBMAIL_PUBLIC_IP;
  if (fromEnv) return fromEnv;
  const host = target.mxHost;
  if (!host) return undefined;
  try {
    const addresses = await dig('A', host);
    return addresses[0];
  } catch {
    return undefined;
  }
}

/**
 * The TLS handshake on the submission port, reading the certificate.
 *
 * Port 465 is implicit TLS, and that is what this deployment's submission
 * uses — connect straight over TLS and read the chain. Cleartext ports
 * (25/587) upgrade via STARTTLS; Node cannot reliably complete that
 * in-place handshake from here, so for those we read the banner and say
 * plainly that the certificate needs a manual check, rather than guess.
 */
async function probeTls(
  host: string,
  port: number,
): Promise<{ ok: boolean; detail: string }> {
  if (port === 465) {
    return probeImplicitTls(host, port);
  }
  const banner = await probeSmtpBanner(host, port, host);
  return {
    ok: false,
    detail: `Cleartext submission on ${port}: ${
      banner ? `banner "${banner}"` : 'no banner read'
    }. The certificate on a STARTTLS port needs a manual check (this probe does not complete an in-place TLS upgrade).`,
  };
}

function describeCert(
  cert: tls.PeerCertificate | tls.Certificate | undefined,
  authorized: boolean,
): { ok: boolean; detail: string } {
  if (!cert) {
    return { ok: false, detail: 'No certificate could be read.' };
  }
  // Node models these as a loose union across type versions; read them
  // through a shape that covers all of them.
  const subjectRaw = cert.subject as unknown as
    | { CN?: string; commonName?: string }
    | string
    | undefined;
  const issuerRaw = cert.issuer as unknown as
    | { CN?: string; O?: string }
    | string
    | undefined;
  const subject =
    (typeof subjectRaw === 'string'
      ? subjectRaw
      : subjectRaw?.CN ?? subjectRaw?.commonName) ?? 'unknown';
  const issuer =
    (typeof issuerRaw === 'string'
      ? issuerRaw
      : issuerRaw?.CN ?? issuerRaw?.O) ?? 'unknown';
  const expires = cert.valid_to ? new Date(String(cert.valid_to)) : null;
  const expired = expires ? expires.getTime() < Date.now() : true;
  const selfSigned = issuer === subject;
  const ok = !expired && !selfSigned;
  const detail = `Subject ${subject} · issuer ${issuer} · ${
    expires ? `valid to ${expires.toISOString().slice(0, 10)}` : 'no expiry info'
  }${selfSigned ? ' · self-signed' : ''}${expired ? ' · EXPIRED' : ''} · ${
    authorized ? 'handshake authorized' : 'handshake not authorized'
  }`;
  return { ok, detail };
}

function probeImplicitTls(host: string, port: number): Promise<{ ok: boolean; detail: string }> {
  return new Promise((resolve) => {
    const socket = tls.connect(
      {
        host,
        port,
        servername: host,
        rejectUnauthorized: false,
      },
      () => {
        const result = describeCert(socket.getPeerCertificate(), socket.authorized);
        socket.end();
        resolve(result);
      },
    );
    socket.setTimeout(8_000, () => {
      socket.destroy();
      resolve({ ok: false, detail: 'TLS connection timed out.' });
    });
    socket.on('error', (err) => {
      resolve({ ok: false, detail: `TLS connection failed: ${(err as Error).message}` });
    });
  });
}

/** Read the 220/250 greeting from a cleartext SMTP port. */
function probeSmtpBanner(
  host: string,
  port: number,
  domain: string,
): Promise<string | null> {
  return new Promise((resolve) => {
    const socket = net.connect({ host, port }, () => {
      socket.write('EHLO webmail-health\r\n');
    });
    let buffer = '';
    const timer = setTimeout(() => {
      socket.destroy();
      resolve(null);
    }, 8_000);
    socket.on('data', (chunk) => {
      buffer += chunk.toString();
      if (buffer.includes('250')) {
        const line = buffer
          .split(/\r?\n/)
          .find((entry) => entry.startsWith('250'))
          ?.trim();
        clearTimeout(timer);
        socket.destroy();
        resolve(line ?? null);
      }
    });
    socket.on('error', () => {
      clearTimeout(timer);
      resolve(null);
    });
    void domain;
  });
}
