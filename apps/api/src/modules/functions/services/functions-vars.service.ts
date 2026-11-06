import { Injectable } from '@nestjs/common';
import { CryptoService } from '@/modules/crypto/crypto.service';

/** What a caller who may not read the secrets sees in place of a value. */
export const MASKED = '[masked]';

/**
 * A function's variables — the credentials it calls with.
 *
 * They used to be stored in plain text and returned to every member of the
 * project, whatever their role. They are encrypted on write, masked on read
 * for anyone who does not administer the project, and decrypted only for the
 * runtime — the one thing that genuinely needs them.
 */
@Injectable()
export class FunctionsVarsService {
  constructor(private cryptoService: CryptoService) {}

  /** Encrypt a set of variables. */
  encrypt(envVars: Record<string, string>): Record<string, string> {
    const out: Record<string, string> = {};
    for (const [key, value] of Object.entries(envVars ?? {})) {
      out[key] = this.cryptoService.encrypt(String(value ?? ''));
    }
    return out;
  }

  /**
   * Decrypt a set of variables.
   *
   * A value that was written before the variables were encrypted is legacy
   * plaintext; it is passed through as it is, so a live function keeps
   * working, and it is re-encrypted the next time the variables are saved.
   */
  decrypt(envVars: Record<string, string>): Record<string, string> {
    const out: Record<string, string> = {};
    for (const [key, value] of Object.entries(envVars ?? {})) {
      const raw = String(value ?? '');
      try {
        out[key] = this.cryptoService.decrypt(raw);
      } catch {
        out[key] = this.isCiphertext(raw) ? '' : raw;
      }
    }
    return out;
  }

  /**
   * The variables as a page sees them.
   *
   * With the secrets hidden, every value is replaced by the mask. With them
   * allowed, the values are decrypted — and a value that cannot be decrypted
   * says so rather than showing ciphertext.
   */
  present(stored: Record<string, string> | null | undefined, canSeeSecrets: boolean): Record<string, string> {
    const values = (stored ?? {}) as Record<string, string>;
    if (!canSeeSecrets) {
      const masked: Record<string, string> = {};
      for (const key of Object.keys(values)) masked[key] = MASKED;
      return masked;
    }
    const revealed: Record<string, string> = {};
    for (const [key, value] of Object.entries(values)) {
      try {
        revealed[key] = this.cryptoService.decrypt(String(value ?? ''));
      } catch {
        revealed[key] = '[decrypt error]';
      }
    }
    return revealed;
  }

  /**
   * Merge the incoming variables with the stored ones.
   *
   * A value of `[masked]` is not a value — it is the platform's own word for
   * "there is a secret here and you may not read it". Saving a page that
   * shows the mask back must not overwrite the secret with the word
   * "masked", so a masked value keeps what is stored.
   */
  merge(
    incoming: Record<string, string>,
    stored: Record<string, string>,
  ): Record<string, string> {
    const out: Record<string, string> = {};
    for (const [key, value] of Object.entries(incoming ?? {})) {
      if (value === MASKED && key in stored) {
        out[key] = stored[key];
        continue;
      }
      out[key] = this.cryptoService.encrypt(String(value ?? ''));
    }
    return out;
  }

  /** Whether a stored value is in the platform's ciphertext format. */
  private isCiphertext(value: string): boolean {
    return value.split(':').length === 3 && value.length > 40;
  }
}
