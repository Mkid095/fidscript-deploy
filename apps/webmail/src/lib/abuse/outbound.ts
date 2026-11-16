/**
 * Outbound abuse protection, enforced at the submission proxy.
 *
 * Stalwart does the MTA's own queue throttling; this is the application's
 * layer on top of it, keyed to the account the visit belongs to, so one
 * compromised mailbox cannot freely damage the reputation of every domain
 * this server sends from. Three bars, in order:
 *
 *   1. Suppression — never send to an address already known-bad
 *      (hard bounce, repeated soft bounces, or a complaint).
 *   2. Per-account volume — per-hour and per-day caps, stricter for
 *      young accounts.
 *   3. Record — every send (allowed or rejected) is written to the
 *      counters, so the numbers are real, not aspirational.
 */
import { db } from '@/lib/db';
import type { Credential } from '@/lib/stalwart/mail';

const HOUR_MS = 3_600_000;
const DAY_MS = 86_400_000;
const NEW_ACCOUNT_MS = 4 * DAY_MS;

function sendLimits(): { perHour: number; perDay: number } {
  const perHour = Number(process.env.WEBMAIL_MAX_SEND_PER_HOUR ?? 200);
  const perDay = Number(process.env.WEBMAIL_MAX_SEND_PER_DAY ?? 1000);
  return { perHour, perDay };
}

function newAccountLimits(): { perHour: number; perDay: number } {
  return {
    perHour: Number(process.env.WEBMAIL_NEW_ACCOUNT_PER_HOUR ?? 25),
    perDay: Number(process.env.WEBMAIL_NEW_ACCOUNT_PER_DAY ?? 100),
  };
}

/** The hour-bucket label for "now". */
function hourBucket(now = new Date()): string {
  return now.toISOString().slice(0, 13); // "2026-11-09T14"
}

function dayBucket(now = new Date()): string {
  return now.toISOString().slice(0, 10); // "2026-11-09"
}

export interface SendDecision {
  ok: boolean;
  /** The recipients that may go out. */
  allowed: string[];
  /** The recipients that are suppressed, and why. */
  suppressed: Array<{ address: string; reason: string }>;
  /** A volume block, when the whole send is refused. */
  blocked?: { reason: string; limit: number; current: number };
}

/**
 * Decide whether this send may proceed, and which recipients survive the
 * suppression list. Called by the send path before anything is queued.
 */
export async function decideSend(
  cred: Credential,
  recipients: string[],
): Promise<SendDecision> {
  const mailbox = cred.user.toLowerCase();

  // 1. Suppression.
  const targets = recipients.map((entry) => entry.trim().toLowerCase()).filter(Boolean);
  const unique = Array.from(new Set(targets));
  let suppressed: Array<{ address: string; reason: string }> = [];
  let allowed = unique;
  if (unique.length) {
    const rows = await db.suppressedAddress.findMany({ where: { address: { in: unique } } });
    const now = Date.now();
    const active = rows.filter(
      (row) => !row.untilAt || row.untilAt.getTime() > now,
    );
    if (active.length) {
      const blockedSet = new Set(active.map((row) => row.address));
      suppressed = active.map((row) => ({ address: row.address, reason: row.reason }));
      allowed = unique.filter((address) => !blockedSet.has(address));
    }
  }

  // If every recipient is suppressed, the send is refused outright.
  if (allowed.length === 0 && suppressed.length > 0) {
    return {
      ok: false,
      allowed: [],
      suppressed,
      blocked: {
        reason: 'Every recipient is on the suppression list.',
        limit: 0,
        current: suppressed.length,
      },
    };
  }

  // 2. Per-account volume, stricter for a young account.
  const accountAgeMs = await accountAge(mailbox);
  const young = accountAgeMs !== null && accountAgeMs < NEW_ACCOUNT_MS;
  const caps = young ? newAccountLimits() : sendLimits();

  const [hourStat, dayStat] = await Promise.all([
    db.sendStat.findUnique({
      where: { mailbox_bucket: { mailbox, bucket: hourBucket() } },
    }),
    db.sendStat.findUnique({
      where: { mailbox_bucket: { mailbox, bucket: dayBucket() } },
    }),
  ]);
  const hourCount = (hourStat?.sent ?? 0) + allowed.length;
  const dayCount = (dayStat?.sent ?? 0) + allowed.length;

  if (hourCount > caps.perHour) {
    return {
      ok: false,
      allowed: [],
      suppressed,
      blocked: {
        reason: `Hourly send limit reached${young ? ' (new account)' : ''}.`,
        limit: caps.perHour,
        current: hourCount,
      },
    };
  }
  if (dayCount > caps.perDay) {
    return {
      ok: false,
      allowed: [],
      suppressed,
      blocked: {
        reason: `Daily send limit reached${young ? ' (new account)' : ''}.`,
        limit: caps.perDay,
        current: dayCount,
      },
    };
  }

  return { ok: true, allowed, suppressed };
}

/**
 * Record the outcome so the counters stay real. Called after the send
 * attempt with how many went out and how many were rejected.
 */
export async function recordSend(
  mailbox: string,
  sent: number,
  rejected: number,
): Promise<void> {
  const mail = mailbox.toLowerCase();
  const upsert = (bucket: string, s: number, r: number) =>
    db.sendStat.upsert({
      where: { mailbox_bucket: { mailbox: mail, bucket } },
      create: { mailbox: mail, bucket, sent: s, rejected: r },
      update: { sent: { increment: s }, rejected: { increment: r } },
    });
  // The hour counter tracks both sends and rejects; the daily counter
  // tracks sends only (rejects are not reputation damage to the domain).
  await Promise.all([
    upsert(hourBucket(), sent, rejected),
    sent ? upsert(dayBucket(), sent, 0) : Promise.resolve(),
  ]);
}

/**
 * Mark an address suppressed so it is never sent to again (or until the
 * window lapses).
 */
export async function suppress(
  address: string,
  reason: string,
  untilAt?: Date,
  note = '',
): Promise<void> {
  await db.suppressedAddress.upsert({
    where: { address: address.toLowerCase() },
    create: {
      address: address.toLowerCase(),
      reason,
      untilAt: untilAt ?? null,
      note,
    },
    update: { reason, untilAt: untilAt ?? null, note: note || undefined },
  });
}

/** When the mailbox was first seen sending, or null if unknown. */
async function accountAge(mailbox: string): Promise<number | null> {
  const oldest = await db.sendStat.findFirst({
    where: { mailbox },
    orderBy: { bucket: 'asc' },
    select: { bucket: true },
  });
  if (!oldest) return null;
  // The oldest hour-bucket is when we first saw this mailbox send.
  const then = new Date(oldest.bucket).getTime();
  return Date.now() - then;
}
