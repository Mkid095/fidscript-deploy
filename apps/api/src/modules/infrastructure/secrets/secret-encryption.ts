/**
 * Shared encryption helpers for the Infrastructure module.
 *
 * Format: `iv:authTag:ciphertext` — all base64 — same scheme the
 * installation module already uses. The key comes from
 * `ENCRYPTION_KEY` / `ENCRYPTION_KEY_FILE` env vars; the same 32-byte
 * AES-256 key is shared by every other component (Stalwart secrets,
 * Cloudflare OAuth tokens, SMTP credentials).
 *
 * Why a shared module: previously every service reimplemented these
 * helpers inline with subtle format differences. Centralising makes the
 * Secrets service the only writer/reader, which makes key rotation
 * straightforward.
 */
import { randomBytes, createCipheriv, createDecipheriv } from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_BYTES = 12; // GCM standard
const KEY_BYTES = 32; // 256 bits

function getKey(): Buffer {
  const envKey = process.env.ENCRYPTION_KEY;
  if (envKey) {
    const buf = Buffer.from(envKey, 'base64');
    if (buf.length !== KEY_BYTES) {
      throw new Error(
        `ENCRYPTION_KEY must be ${KEY_BYTES} bytes (base64-encoded). Got ${buf.length}.`,
      );
    }
    return buf;
  }
  const envKeyFile = process.env.ENCRYPTION_KEY_FILE;
  if (envKeyFile) {
    try {
      const raw = require('fs').readFileSync(envKeyFile, 'utf8').trim();
      const buf = Buffer.from(raw, 'base64');
      if (buf.length !== KEY_BYTES) {
        throw new Error(
          `ENCRYPTION_KEY_FILE content must be ${KEY_BYTES} bytes (base64-encoded). Got ${buf.length}.`,
        );
      }
      return buf;
    } catch (err) {
      throw new Error(`ENCRYPTION_KEY_FILE could not be read: ${(err as Error).message}`);
    }
  }
  throw new Error('ENCRYPTION_KEY or ENCRYPTION_KEY_FILE must be set.');
}

export function encryptSecret(plaintext: string): Buffer {
  const key = getKey();
  const iv = randomBytes(IV_BYTES);
  const cipher = createCipheriv(ALGORITHM, key, iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return Buffer.concat([iv, authTag, ciphertext]);
}

export function decryptSecret(blob: Buffer): string {
  const key = getKey();
  if (blob.length < IV_BYTES + 16) {
    throw new Error('Encrypted secret is too short to be valid.');
  }
  const iv = blob.subarray(0, IV_BYTES);
  const authTag = blob.subarray(IV_BYTES, IV_BYTES + 16);
  const ciphertext = blob.subarray(IV_BYTES + 16);
  const decipher = createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);
  const plaintext = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
  return plaintext.toString('utf8');
}
