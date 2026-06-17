import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

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
}
