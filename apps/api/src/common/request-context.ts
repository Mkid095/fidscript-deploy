import { Request } from 'express';

export interface RequestContext {
  /** Originating client IP (first hop of X-Forwarded-For, else req.ip). */
  ipAddress?: string;
  /** Client User-Agent string. */
  userAgent?: string;
}

/**
 * Extract actor IP + User-Agent from an Express request, consistently.
 *
 * Traefik sets `X-Forwarded-For`; we take its first hop (the real client) and
 * fall back to `req.ip`. The result feeds the audit context
 * (`actorType`/`ipAddress`/`userAgent`) on platform events so the audit log
 * records who acted, from where, on what device.
 */
export function extractRequestContext(req: Request): RequestContext {
  const forwarded = req.headers['x-forwarded-for'];
  const rawIp = Array.isArray(forwarded) ? forwarded[0] : forwarded;
  const ipAddress = rawIp?.toString().split(',')[0]?.trim() || req.ip || undefined;
  const userAgent = (req.headers['user-agent'] as string | undefined) || undefined;
  return { ipAddress, userAgent };
}
