/**
 * Idempotency record store — DB persistence for `emailIdempotencyRecord`.
 *
 * All SQL operations against the idempotency table live here. Redis lock
 * management is the responsibility of the higher-level
 * EmailIdempotencyService (which composes this with the Redis client).
 */
import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';

export interface IdempotencyRecord {
  idempotencyKey: string;
  projectId: string;
  requestHash: string;
  status: 'PROCESSING' | 'COMPLETED' | 'FAILED';
  responseCode: number | null;
  responseBody: unknown;
  expiresAt: Date;
}

@Injectable()
export class IdempotencyStoreService {
  constructor(private prisma: PrismaService) {}

  async findByKey(idempotencyKey: string): Promise<IdempotencyRecord | null> {
    const row = await this.prisma.emailIdempotencyRecord.findUnique({ where: { idempotencyKey } });
    if (!row) return null;
    return row as unknown as IdempotencyRecord;
  }

  /**
   * Insert a new PROCESSING record. Throws on unique-constraint conflict
   * (caller decides what to do — re-check vs conflict).
   */
  async insertProcessing(
    idempotencyKey: string,
    projectId: string,
    requestHash: string,
    expiresAt: Date,
  ): Promise<void> {
    await this.prisma.emailIdempotencyRecord.create({
      data: { idempotencyKey, projectId, requestHash, status: 'PROCESSING', expiresAt },
    });
  }

  async markCompleted(
    idempotencyKey: string,
    responseCode: number,
    responseBody: unknown,
  ): Promise<void> {
    await this.prisma.emailIdempotencyRecord.update({
      where: { idempotencyKey },
      data: { status: 'COMPLETED', responseCode, responseBody: responseBody as object },
    }).catch(() => {});
  }

  async markFailed(
    idempotencyKey: string,
    responseCode: number,
    responseBody: unknown,
  ): Promise<void> {
    await this.prisma.emailIdempotencyRecord.update({
      where: { idempotencyKey },
      data: { status: 'FAILED', responseCode, responseBody: responseBody as object },
    }).catch(() => {});
  }

  async deleteRecord(idempotencyKey: string): Promise<void> {
    await this.prisma.emailIdempotencyRecord.delete({ where: { idempotencyKey } });
  }
}
