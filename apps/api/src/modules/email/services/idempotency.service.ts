import { Injectable, ConflictException, HttpException, HttpStatus } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { RedisService } from '@/modules/redis/redis.service';
import * as crypto from 'crypto';

export interface IdempotencyResult {
  /** 'ok' = proceed, 'cached' = return stored response, 'conflict' = retry later */
  action: 'ok' | 'cached' | 'conflict';
  /** Present when action === 'cached' */
  cachedResponse?: { code: number; body: unknown };
  /** Present when action === 'conflict' */
  conflictMessage?: string;
}

const LOCK_TTL_MS = 30_000; // 30s lock — covers a typical send operation
const RECORD_TTL_MS = 86_400_000; // 24h record TTL

@Injectable()
export class EmailIdempotencyService {
  constructor(
    private prisma: PrismaService,
    private redis: RedisService,
  ) {}

  /**
   * Check idempotency for a send operation.
   *
   * Flow:
   *  - No key provided → allow (client manages its own deduplication)
   *  - Record not found → acquire Redis lock, insert PROCESSING row, return 'ok'
   *  - Record COMPLETED → return 'cached' with stored response
   *  - Record FAILED   → clear record, allow retry (acts like no record existed)
   *  - Record PROCESSING → return 'conflict' (another request is in-flight)
   *  - Redis lock fails → degrade to DB-only check (DB upsert is inherently idempotent)
   *
   * Returns the lock token so the caller MUST call `complete()` or `fail()`.
   *
   * @throws ConflictException (409) when action === 'conflict'
   */
  async checkOrWait(
    projectId: string,
    idempotencyKey: string,
    payload: Record<string, unknown>,
  ): Promise<{ token: string; action: 'ok' | 'cached'; cachedResponse?: { code: number; body: unknown } }> {
    const requestHash = this.hashPayload(payload);
    const lockKey = `idempotency:${projectId}:${idempotencyKey}`;
    const token = crypto.randomBytes(16).toString('hex');

    // 1. Check DB for existing record
    const existing = await this.prisma.emailIdempotencyRecord.findUnique({
      where: { idempotencyKey },
    });

    if (existing) {
      // Payload mismatch — client reused key with different content → 422
      if (existing.requestHash !== requestHash) {
        throw new HttpException(
          `Idempotency-Key '${idempotencyKey}' was already used with a different request body`,
          HttpStatus.UNPROCESSABLE_ENTITY,
        );
      }

      if (existing.status === 'COMPLETED') {
        return {
          token: '',
          action: 'cached',
          cachedResponse: existing.responseCode !== null && existing.responseBody !== null
            ? { code: existing.responseCode, body: existing.responseBody }
            : undefined,
        };
      }

      if (existing.status === 'FAILED') {
        // Allow retry — clear the FAILED record
        await this.prisma.emailIdempotencyRecord.delete({ where: { idempotencyKey } });
        // Fall through to insert PROCESSING below
      } else {
        // PROCESSING — another request is in-flight
        throw new ConflictException(
          `Request with Idempotency-Key '${idempotencyKey}' is already being processed`,
        );
      }
    }

    // 2. Try to acquire Redis lock to prevent concurrent inserts
    const lockAcquired = await this.redis.acquireLock(lockKey, token, LOCK_TTL_MS);
    if (!lockAcquired) {
      // Another process acquired the lock — they may be inserting the record right now
      // Re-check DB after a short wait
      await this.sleep(500);
      const recheck = await this.prisma.emailIdempotencyRecord.findUnique({
        where: { idempotencyKey },
      });
      if (recheck) {
        if (recheck.status === 'COMPLETED') {
          return {
            token: '',
            action: 'cached',
            cachedResponse: recheck.responseCode !== null && recheck.responseBody !== null
              ? { code: recheck.responseCode, body: recheck.responseBody }
              : undefined,
          };
        }
        throw new ConflictException(
          `Request with Idempotency-Key '${idempotencyKey}' is already being processed`,
        );
      }
      // Lock released but no record — someone else processed and cleared it; allow retry
    }

    // 3. Insert PROCESSING record
    const expiresAt = new Date(Date.now() + RECORD_TTL_MS);
    try {
      await this.prisma.emailIdempotencyRecord.create({
        data: {
          idempotencyKey,
          projectId,
          requestHash,
          status: 'PROCESSING',
          expiresAt,
        },
      });
    } catch (err: unknown) {
      // Unique constraint violation = another request just inserted it (race)
      // Re-check status
      const race = await this.prisma.emailIdempotencyRecord.findUnique({
        where: { idempotencyKey },
      });
      if (race?.status === 'COMPLETED') {
        return {
          token: '',
          action: 'cached',
          cachedResponse: race.responseCode !== null && race.responseBody !== null
            ? { code: race.responseCode, body: race.responseBody }
            : undefined,
        };
      }
      // If not COMPLETED, we're still first — the race loser handles conflict
      throw new ConflictException(
        `Request with Idempotency-Key '${idempotencyKey}' is already being processed`,
      );
    }

    return { token, action: 'ok' };
  }

  /**
   * Mark a send operation as completed and store the response.
   * Idempotent — calling multiple times is safe.
   */
  async complete(
    projectId: string,
    idempotencyKey: string,
    token: string,
    responseCode: number,
    responseBody: unknown,
  ): Promise<void> {
    const lockKey = `idempotency:${projectId}:${idempotencyKey}`;
    await this.redis.releaseLock(lockKey, token).catch(() => {});
    try {
      await this.prisma.emailIdempotencyRecord.update({
        where: { idempotencyKey },
        data: { status: 'COMPLETED', responseCode, responseBody: responseBody as object },
      });
    } catch {
      // Record may not exist if FAILED path ran concurrently — ignore
    }
  }

  /**
   * Mark a send operation as failed. Allows retry.
   * Idempotent — calling multiple times is safe.
   */
  async fail(
    projectId: string,
    idempotencyKey: string,
    token: string,
    responseCode: number,
    responseBody: unknown,
  ): Promise<void> {
    const lockKey = `idempotency:${projectId}:${idempotencyKey}`;
    await this.redis.releaseLock(lockKey, token).catch(() => {});
    try {
      await this.prisma.emailIdempotencyRecord.update({
        where: { idempotencyKey },
        data: { status: 'FAILED', responseCode, responseBody: responseBody as object },
      });
    } catch {
      // Record may not exist if COMPLETED path ran first — ignore
    }
  }

  /** SHA-256 hash of the JSON payload — detects same-key/different-body reuse */
  private hashPayload(payload: Record<string, unknown>): string {
    return crypto.createHash('sha256').update(JSON.stringify(payload)).digest('hex');
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
