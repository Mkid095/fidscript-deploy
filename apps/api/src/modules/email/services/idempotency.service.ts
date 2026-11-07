/**
 * Email idempotency — orchestrates the Redis lock + DB record lifecycle
 * for send operations that carry an Idempotency-Key header.
 *
 * Flow:
 *  - No key provided → allow (client manages its own deduplication)
 *  - Record not found → acquire Redis lock, insert PROCESSING row, return 'ok'
 *  - Record COMPLETED → return 'cached' with stored response
 *  - Record FAILED   → clear record, allow retry
 *  - Record PROCESSING → return 'conflict' (another request is in-flight)
 *  - Redis lock fails → degrade to DB-only check
 *
 * Returns a lock token so the caller MUST call `complete()` or `fail()`.
 *
 * Split into:
 *   - IdempotencyStoreService — DB persistence
 *   - EmailIdempotencyService (this) — orchestration with Redis lock
 */
import { Injectable, ConflictException, HttpException, HttpStatus } from '@nestjs/common';
import { RedisService } from '@/modules/redis/redis.service';
import * as crypto from 'crypto';
import { IdempotencyStoreService, IdempotencyRecord } from './idempotency-store.service';

export interface IdempotencyResult {
  /** 'ok' = proceed, 'cached' = return stored response, 'conflict' = retry later */
  action: 'ok' | 'cached' | 'conflict';
  cachedResponse?: { code: number; body: unknown };
  conflictMessage?: string;
}

const LOCK_TTL_MS = 30_000;
const RECORD_TTL_MS = 86_400_000;

@Injectable()
export class EmailIdempotencyService {
  constructor(
    private store: IdempotencyStoreService,
    private redis: RedisService,
  ) {}

  async checkOrWait(
    projectId: string,
    idempotencyKey: string,
    payload: Record<string, unknown>,
  ): Promise<{ token: string; action: 'ok' | 'cached'; cachedResponse?: { code: number; body: unknown } }> {
    const requestHash = this.hashPayload(payload);
    const lockKey = `idempotency:${projectId}:${idempotencyKey}`;
    const token = crypto.randomBytes(16).toString('hex');

    const existing = await this.store.findByKey(idempotencyKey);

    if (existing) {
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
          cachedResponse: this.cachedResponse(existing),
        };
      }
      if (existing.status === 'FAILED') {
        await this.store.deleteRecord(idempotencyKey);
        // Fall through to insert PROCESSING
      } else {
        throw new ConflictException(
          `Request with Idempotency-Key '${idempotencyKey}' is already being processed`,
        );
      }
    }

    const lockAcquired = await this.redis.acquireLock(lockKey, token, LOCK_TTL_MS);
    if (!lockAcquired) {
      await this.sleep(500);
      const recheck = await this.store.findByKey(idempotencyKey);
      if (recheck) {
        if (recheck.status === 'COMPLETED') {
          return { token: '', action: 'cached', cachedResponse: this.cachedResponse(recheck) };
        }
        throw new ConflictException(
          `Request with Idempotency-Key '${idempotencyKey}' is already being processed`,
        );
      }
    }

    const expiresAt = new Date(Date.now() + RECORD_TTL_MS);
    try {
      await this.store.insertProcessing(idempotencyKey, projectId, requestHash, expiresAt);
    } catch {
      const race = await this.store.findByKey(idempotencyKey);
      if (race?.status === 'COMPLETED') {
        return { token: '', action: 'cached', cachedResponse: this.cachedResponse(race) };
      }
      throw new ConflictException(
        `Request with Idempotency-Key '${idempotencyKey}' is already being processed`,
      );
    }

    return { token, action: 'ok' };
  }

  async complete(
    projectId: string,
    idempotencyKey: string,
    token: string,
    responseCode: number,
    responseBody: unknown,
  ): Promise<void> {
    const lockKey = `idempotency:${projectId}:${idempotencyKey}`;
    await this.redis.releaseLock(lockKey, token).catch(() => {});
    await this.store.markCompleted(idempotencyKey, responseCode, responseBody);
  }

  async fail(
    projectId: string,
    idempotencyKey: string,
    token: string,
    responseCode: number,
    responseBody: unknown,
  ): Promise<void> {
    const lockKey = `idempotency:${projectId}:${idempotencyKey}`;
    await this.redis.releaseLock(lockKey, token).catch(() => {});
    await this.store.markFailed(idempotencyKey, responseCode, responseBody);
  }

  private cachedResponse(record: IdempotencyRecord): { code: number; body: unknown } | undefined {
    return record.responseCode !== null && record.responseBody !== null
      ? { code: record.responseCode, body: record.responseBody }
      : undefined;
  }

  private hashPayload(payload: Record<string, unknown>): string {
    return crypto.createHash('sha256').update(JSON.stringify(payload)).digest('hex');
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
