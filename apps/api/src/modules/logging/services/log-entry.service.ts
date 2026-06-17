import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';

@Injectable()
export class LogEntryService {
  constructor(private prisma: PrismaService) {}

  async writeLog(projectId: string, dto: { stream: string; level: string; message: string; metadata?: Record<string, any> }) {
    let stream = await this.prisma.logStream.findFirst({
      where: { projectId, name: dto.stream },
    });

    if (!stream) {
      stream = await this.prisma.logStream.create({
        data: {
          projectId,
          name: dto.stream,
          type: 'application',
        },
      });
    }

    const entry = await this.prisma.logEntry.create({
      data: {
        streamId: stream.id,
        level: dto.level,
        message: dto.message,
        metadata: (dto.metadata || {}) as any,
        timestamp: new Date(),
      },
    });

    return { entryId: entry.id };
  }

  async writeBatchLogs(projectId: string, dto: { logs: Array<{ stream: string; level: string; message: string; metadata?: Record<string, any> }> }) {
    const streamMap = new Map<string, string>();

    for (const log of dto.logs) {
      if (!streamMap.has(log.stream)) {
        let stream = await this.prisma.logStream.findFirst({
          where: { projectId, name: log.stream },
        });

        if (!stream) {
          stream = await this.prisma.logStream.create({
            data: {
              projectId,
              name: log.stream,
              type: 'application',
            },
          });
        }

        streamMap.set(log.stream, stream.id);
      }
    }

    const entries = await this.prisma.$transaction(
      dto.logs.map((log) =>
        this.prisma.logEntry.create({
          data: {
            streamId: streamMap.get(log.stream)!,
            level: log.level,
            message: log.message,
            metadata: (log.metadata || {}) as any,
            timestamp: new Date(),
          },
        }),
      ),
    );

    return { entryCount: entries.length };
  }

  async getLogs(projectId: string, dto: { stream?: string; level?: string; startTime?: Date; endTime?: Date; search?: string; limit?: number; cursor?: string }) {
    const where: any = { stream: { projectId } };

    if (dto.stream) {
      where.streamId = dto.stream;
    }

    if (dto.level) {
      where.level = dto.level;
    }

    if (dto.startTime || dto.endTime) {
      where.timestamp = {};
      if (dto.startTime) where.timestamp.gte = dto.startTime;
      if (dto.endTime) where.timestamp.lte = dto.endTime;
    }

    if (dto.search) {
      where.message = { contains: dto.search, mode: 'insensitive' };
    }

    const limit = dto.limit || 100;

    const logs = await this.prisma.logEntry.findMany({
      where,
      include: { stream: { select: { name: true, type: true } } },
      orderBy: { timestamp: 'desc' },
      take: limit + 1,
      ...(dto.cursor && { cursor: { id: dto.cursor }, skip: 1 }),
    });

    const hasMore = logs.length > limit;
    if (hasMore) logs.pop();

    return {
      logs: logs.reverse(),
      nextCursor: hasMore ? logs[logs.length - 1]?.id : null,
    };
  }

  async getLogsByStream(projectId: string, streamName: string, dto: { level?: string; startTime?: Date; endTime?: Date; search?: string; limit?: number; cursor?: string }) {
    const stream = await this.prisma.logStream.findFirst({
      where: { projectId, name: streamName },
    });
    if (!stream) throw new NotFoundException('Log stream not found');

    const where: any = { streamId: stream.id };

    if (dto.level) {
      where.level = dto.level;
    }

    if (dto.startTime || dto.endTime) {
      where.timestamp = {};
      if (dto.startTime) where.timestamp.gte = dto.startTime;
      if (dto.endTime) where.timestamp.lte = dto.endTime;
    }

    if (dto.search) {
      where.message = { contains: dto.search, mode: 'insensitive' };
    }

    const limit = dto.limit || 100;

    const logs = await this.prisma.logEntry.findMany({
      where,
      orderBy: { timestamp: 'desc' },
      take: limit + 1,
      ...(dto.cursor && { cursor: { id: dto.cursor }, skip: 1 }),
    });

    const hasMore = logs.length > limit;
    if (hasMore) logs.pop();

    return {
      stream: stream.name,
      logs: logs.reverse(),
      nextCursor: hasMore ? logs[logs.length - 1]?.id : null,
    };
  }

  async getLogStats(projectId: string, streamName?: string) {
    const where: any = { stream: { projectId } };
    if (streamName) {
      where.stream = { projectId, name: streamName };
    }

    const [total, debugCount, infoCount, warnCount, errorCount, fatalCount, streamCount] =
      await Promise.all([
        this.prisma.logEntry.count({ where }),
        this.prisma.logEntry.count({ where: { ...where, level: 'debug' } }),
        this.prisma.logEntry.count({ where: { ...where, level: 'info' } }),
        this.prisma.logEntry.count({ where: { ...where, level: 'warn' } }),
        this.prisma.logEntry.count({ where: { ...where, level: 'error' } }),
        this.prisma.logEntry.count({ where: { ...where, level: 'fatal' } }),
        this.prisma.logStream.count({ where: { projectId } }),
      ]);

    return {
      total,
      byLevel: { debug: debugCount, info: infoCount, warn: warnCount, error: errorCount, fatal: fatalCount },
      streamCount,
    };
  }

  async getLogTimeline(projectId: string, streamName: string, interval = '1h') {
    const stream = await this.prisma.logStream.findFirst({
      where: { projectId, name: streamName },
    });
    if (!stream) throw new NotFoundException('Log stream not found');

    const now = new Date();
    const intervals: Record<string, number> = {
      '5m': 5 * 60 * 1000,
      '15m': 15 * 60 * 1000,
      '1h': 60 * 60 * 1000,
      '6h': 6 * 60 * 60 * 1000,
      '24h': 24 * 60 * 60 * 1000,
    };

    const startTime = new Date(now.getTime() - (intervals[interval] || intervals['1h']));

    const logs = await this.prisma.logEntry.findMany({
      where: {
        streamId: stream.id,
        timestamp: { gte: startTime },
      },
      select: { timestamp: true, level: true },
      orderBy: { timestamp: 'asc' },
    });

    const buckets = new Map<string, { debug: number; info: number; warn: number; error: number; fatal: number }>();

    for (const log of logs) {
      const bucketTime = new Date(
        Math.floor(log.timestamp.getTime() / (intervals[interval] || intervals['1h'])) *
          (intervals[interval] || intervals['1h'])
      );
      const key = bucketTime.toISOString();

      if (!buckets.has(key)) {
        buckets.set(key, { debug: 0, info: 0, warn: 0, error: 0, fatal: 0 });
      }
      (buckets.get(key)! as Record<string, number>)[log.level]++;
    }

    return {
      stream: streamName,
      interval,
      timeline: Array.from(buckets.entries()).map(([timestamp, counts]) => ({
        timestamp,
        ...counts,
      })),
    };
  }
}
