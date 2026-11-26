#!/usr/bin/env node
/**
 * decrypt-backup.mjs — take an encrypted platform backup file and write
 * back the plaintext it carries.
 *
 * Two wire formats, both AES-256-GCM under the platform's ENCRYPTION_KEY:
 *
 *  - postgres dumps  (`*.dump.gz.enc`): a per-file PBKDF2 frame —
 *      salt(32) || iv(12) || authTag(16) || ciphertext
 *    (the service's `encryptLargeFile`), written over a gzipped
 *    `pg_dump --format=custom`.
 *  - manifests       (`*.json.enc`): the CryptoService format —
 *      base64(iv):base64(authTag):base64(ciphertext).
 *
 * The script detects which of the two it was handed and names the
 * output for it: `x.dump.gz` or `x.json`. This is the step of the
 * DR runbook (docs/SECURITY.md §4) that is otherwise only inside the
 * API.
 *
 * Usage:
 *   ENCRYPTION_KEY_FILE=/opt/fidscript-deploy/installer/docker/secrets/encryption_key \
 *     node scripts/decrypt-backup.mjs in.dump.gz.enc [out]
 *   ENCRYPTION_KEY=<base64 32-byte key> node scripts/decrypt-backup.mjs in.json.enc
 */
import * as crypto from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';

function loadKey() {
  let b64 = process.env.ENCRYPTION_KEY;
  if (!b64 && process.env.ENCRYPTION_KEY_FILE) {
    b64 = readFileSync(process.env.ENCRYPTION_KEY_FILE, 'utf8').trim();
  }
  if (!b64) {
    console.error('Set ENCRYPTION_KEY (base64) or ENCRYPTION_KEY_FILE.');
    process.exit(2);
  }
  const raw = Buffer.from(b64, 'base64');
  if (raw.length !== 32) {
    console.error('ENCRYPTION_KEY must be a base64-encoded 32-byte key.');
    process.exit(2);
  }
  return raw;
}

/**
 * The dump frame: salt || iv || authTag || ciphertext.
 * Returns null when the frame is not the right shape, so the caller
 * can fall through to the manifest format.
 */
function decryptDumpFrame(data, key) {
  if (data.length <= 60) return null;
  const salt = data.subarray(0, 32);
  const iv = data.subarray(32, 44);
  const authTag = data.subarray(44, 60);
  const ciphertext = data.subarray(60);
  const derived = crypto.pbkdf2Sync(key, salt, 100_000, 32, 'sha512');
  const decipher = crypto.createDecipheriv('aes-256-gcm', derived, iv);
  decipher.setAuthTag(authTag);
  return Buffer.concat([decipher.update(ciphertext), decipher.final()]);
}

/**
 * The manifest format: base64(iv):base64(authTag):base64(ciphertext).
 */
function decryptManifest(data, key) {
  const text = data.toString('utf8');
  const [ivB64, tagB64, ctB64] = text.split(':');
  if (!ivB64 || !tagB64 || !ctB64) throw new Error('not the manifest format');
  const decipher = crypto.createDecipheriv(
    'aes-256-gcm',
    key,
    Buffer.from(ivB64, 'base64'),
  );
  decipher.setAuthTag(Buffer.from(tagB64, 'base64'));
  return Buffer.concat([
    decipher.update(Buffer.from(ctB64, 'base64')),
    decipher.final(),
  ]);
}

const [input, outArg] = process.argv.slice(2);
if (!input) {
  console.error('Usage: decrypt-backup.mjs <encrypted-file> [out]');
  process.exit(2);
}

const key = loadKey();
const data = readFileSync(input);

let plain;
let kind;
try {
  plain = decryptDumpFrame(data, key);
  kind = 'dump';
} catch {
  plain = null;
}
if (plain === null) {
  plain = decryptManifest(data, key);
  kind = 'manifest';
}

const out = outArg ?? `${input.replace(/\.enc$/, '')}`;
writeFileSync(out, plain);
console.log(
  `${kind === 'dump' ? 'pg dump' : 'manifest'}: ${input} → ${out} (${plain.length} bytes, ${kind === 'dump' ? 'gunzip and pg_restore next' : 'JSON — see tableCounts'})`,
);
