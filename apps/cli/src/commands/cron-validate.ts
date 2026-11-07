/**
 * CLI cron — input validation helpers.
 * Extracted from cron.ts to keep the command handler under the ANPAS 150-line limit.
 */

function die(msg: string): never {
  console.error(`Error: ${msg}`);
  process.exit(1);
}

const MAX_NAME_LEN = 100;
const MAX_EXPR_LEN = 200;
/**
 * Standard 5-field cron expression: minute hour day-of-month month day-of-week.
 * We accept the comma, range (a-b), step (*\/n), and list forms. The runtime
 * will do the authoritative parse — this is just to catch obvious typos.
 */
const CRON_FIELDS = /^[\s*?,0-9\/\-]+$/;

export interface ParsedCronSchedule {
  raw: string;
  fields: string[];
}

export function parseCronSchedule(raw: string): ParsedCronSchedule {
  const trimmed = raw.trim();
  if (!trimmed) die('Cron schedule must not be empty (e.g. "*/5 * * * *")');
  if (trimmed.length > MAX_EXPR_LEN) die(`Cron schedule too long (max ${MAX_EXPR_LEN} chars)`);
  const fields = trimmed.split(/\s+/);
  if (fields.length !== 5) {
    die(`Cron schedule must have exactly 5 fields (minute hour dom month dow), got ${fields.length}`);
  }
  for (const f of fields) {
    if (!CRON_FIELDS.test(f)) die(`Invalid cron field "${f}" — allowed chars: digits, *, /, -, ,`);
  }
  return { raw: trimmed, fields };
}

export function validateCronName(name: string): string {
  const trimmed = name.trim();
  if (!trimmed) die('Cron job name must not be empty');
  if (trimmed.length > MAX_NAME_LEN) die(`Cron job name too long (max ${MAX_NAME_LEN} chars)`);
  return trimmed;
}

export function validateOptionalUrl(url: string | undefined): string | undefined {
  if (!url) return undefined;
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    die(`Invalid --url: ${url}`);
  }
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    die(`--url must be http(s), got "${parsed.protocol}"`);
  }
  return parsed.toString();
}

export function parseEnabledFlag(raw: string | undefined): boolean | undefined {
  if (raw === undefined) return undefined;
  if (raw === 'true') return true;
  if (raw === 'false') return false;
  die(`--enabled must be "true" or "false", got "${raw}"`);
}