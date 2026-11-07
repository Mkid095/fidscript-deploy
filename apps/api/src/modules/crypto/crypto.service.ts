import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import * as fs from 'fs';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const AUTH_TAG_LENGTH = 16;

@Injectable()
export class CryptoService implements OnModuleInit {
  private key: Buffer | null = null;

  constructor(private configService: ConfigService) {}

  onModuleInit() {
    // Supports ENCRYPTION_KEY env var OR ENCRYPTION_KEY_FILE (Docker secret convention)
    let keyBase64 = this.configService.get<string>('ENCRYPTION_KEY');
    if (!keyBase64) {
      const keyFile = this.configService.get<string>('ENCRYPTION_KEY_FILE');
      if (keyFile) {
        try { keyBase64 = fs.readFileSync(keyFile, 'utf8').trim(); } catch { keyBase64 = undefined; }
      }
    }
    if (!keyBase64) {
      throw new Error('ENCRYPTION_KEY must be set. Use ENCRYPTION_KEY_FILE env var.');
    }
    const raw = Buffer.from(keyBase64, 'base64');
    if (raw.length !== 32) {
      throw new Error(`ENCRYPTION_KEY must be 32 bytes (got ${raw.length}). Provide base64-encoded 32-byte key.`);
    }
    this.key = raw;
  }

  encrypt(plaintext: string): string {
    if (!this.key) throw new Error('CryptoService not initialized');
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv(ALGORITHM, this.key, iv);
    const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
    const authTag = cipher.getAuthTag();
    // Format: base64(iv):base64(authTag):base64(ciphertext)
    return `${iv.toString('base64')}:${authTag.toString('base64')}:${encrypted.toString('base64')}`;
  }

  decrypt(ciphertext: string): string {
    if (!this.key) throw new Error('CryptoService not initialized');
    const parts = ciphertext.split(':');
    if (parts.length !== 3) throw new Error('Invalid ciphertext format');
    const [ivB64, authTagB64, encryptedB64] = parts;
    const iv = Buffer.from(ivB64, 'base64');
    const authTag = Buffer.from(authTagB64, 'base64');
    const encrypted = Buffer.from(encryptedB64, 'base64');
    const decipher = crypto.createDecipheriv(ALGORITHM, this.key, iv);
    decipher.setAuthTag(authTag);
    return decipher.update(encrypted) + decipher.final('utf8');
  }
}