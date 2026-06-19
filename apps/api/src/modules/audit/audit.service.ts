import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { QueryAuditEventsDto } from './dto/query-audit-events.dto';

export interface AuditLogInput {
  userId?: string;
  action: string;
  resourceType?: string;
  resourceId?: string;
  metadata?: Record<string, any>;
  ipAddress?: string;
}

@Injectable()
export class AuditService {
  constructor(private prisma: PrismaService) {}

  async log(input: AuditLogInput): Promise<void> {
    await this.prisma.auditLog.create({
      data: {
        userId: input.userId,
        action: input.action,
        resourceType: input.resourceType,
        resourceId: input.resourceId,
        metadata: input.metadata || {},
        ipAddress: input.ipAddress,
      },
    });
  }

  async getLogs(options: {
    userId?: string;
    action?: string;
    limit?: number;
    offset?: number;
  }) {
    const { userId, action, limit = 50, offset = 0 } = options;

    return this.prisma.auditLog.findMany({
      where: {
        ...(userId && { userId }),
        ...(action && { action }),
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
      include: {
        user: {
          select: { id: true, email: true, name: true },
        },
      },
    });
  }

  /**
   * Query platform events (PlatformEvent table) — the canonical audit log.
   * Supports actor/resource/event-type filters, date range, IP, and full-text
   * metadata search. Returns paginated results with total count.
   */
  async queryAuditEvents(dto: QueryAuditEventsDto) {
    const {
      actorId,
      actorType,
      resourceType,
      resourceId,
      eventType,
      ipAddress,
      failedOnly,
      fromDate,
      toDate,
      search,
      page = 1,
      limit = 50,
    } = dto;

    // Build Prisma where clause
    const where: Record<string, unknown> = {};

    if (actorId) where.actorId = actorId;
    if (actorType) where.actorType = actorType;
    if (resourceType) where.resourceType = resourceType;
    if (resourceId) where.resourceId = resourceId;
    if (ipAddress) where.ipAddress = { startsWith: ipAddress };

    // Event type filter: "identity.user" → prefix match "identity.user." (matches identity.user.*)
    // Append "*" at end for exact match: "identity.user.logged_in*" → equals
    if (eventType) {
      const hasWildcard = eventType.endsWith('*');
      const normalized = eventType.replace(/\*$/, '');
      where.type = hasWildcard
        ? { equals: normalized }
        : { startsWith: normalized + '.' };
    }

    // Date range
    if (fromDate || toDate) {
      where.timestamp = {};
      if (fromDate) (where.timestamp as Record<string, unknown>).gte = new Date(fromDate);
      if (toDate) (where.timestamp as Record<string, unknown>).lte = new Date(toDate);
    }

    // Full-text search is applied client-side on the result set (metadata JSON is not
    // reliably queryable across all PostgreSQL/Prisma versions)

    const [events, total] = await Promise.all([
      this.prisma.platformEvent.findMany({
        where,
        orderBy: { timestamp: 'desc' },
        take: limit,
        skip: (page - 1) * limit,
      }),
      this.prisma.platformEvent.count({ where }),
    ]);

    return {
      events,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }
}
