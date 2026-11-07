/**
 * CLI domains — input validation helpers.
 * Extracted from domains.ts to keep the command handler under the ANPAS 150-line limit.
 */
import { die } from './domains-helpers';
import type { DomainType } from '@fidscript-deploy/sdk';

const MAX_DOMAIN_LEN = 253; // RFC 1035 total length cap
const DOMAIN_RE = /^(?=.{1,253}$)(?!-)[A-Za-z0-9-]{1,63}(\.[A-Za-z0-9-]{1,63})+$/;

export function validateDomainName(domain: string): string {
  const trimmed = domain.trim().toLowerCase();
  if (!trimmed) die('Domain must not be empty');
  if (trimmed.length > MAX_DOMAIN_LEN) die(`Domain too long (max ${MAX_DOMAIN_LEN} chars)`);
  if (!DOMAIN_RE.test(trimmed)) {
    die(`Invalid domain "${domain}" — expected a fully-qualified name like "app.example.com"`);
  }
  return trimmed;
}

const ALLOWED_TYPES = new Set<DomainType>(['DEPLOYMENT', 'EMAIL', 'API']);

export function validateDomainType(type: string | undefined): DomainType | undefined {
  if (!type) return undefined;
  const upper = type.toUpperCase() as DomainType;
  if (!ALLOWED_TYPES.has(upper)) {
    die(`Invalid --type "${type}" — allowed: ${Array.from(ALLOWED_TYPES).join(', ')}`);
  }
  return upper;
}