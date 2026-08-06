import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { parseLevels, resolveStreamId } from './log-query-filters';

@Injectable()
export class LogQueryService {
  constructor(private prisma: PrismaService) {}

  async getLogs(projectId: string, dto: { stream?: string; level?: string; startTime?: Date; endTime?: Date; search?: string; limit?: number; cursor?: string }) {
    const where: Record<string, unknown> = {};

    const streamId = await resolveStreamId(this.prisma, projectId, dto.stream);
    if (streamId) where.streamId = streamId;
    else where.stream = { projectId };

    const levels = parseLevels(dto.level);
    if (levels) where.level = Array.isArray(levels) ? { in: levels } : levels;

    if (dto.startTime || dto.endTime) {
      where.timestamp = { ...(dto.startTime && { gte: dto.startTime }), ...(dto.endTime && { lte: dto.endTime }) };
    }
    if (dto.search) where.message = { contains: dto.search, mode: 'insensitive' };

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

    return { logs: logs.reverse(), nextCursor: hasMore ? logs[logs.length - 1]?.id : null };
  }

  async getLogsByStream(projectId: string, streamName: string, dto: { level?: string; startTime?: Date; endTime?: Date; search?: string; limit?: number; cursor?: string }) {
    const stream = await this.prisma.logStream.findUnique({
      where: { projectId_name: { projectId, name: streamName } },
    });
    if (!stream) throw new NotFoundException('Log stream not found');

    const where: Record<string, unknown> = { streamId: stream.id };
    const levels = parseLevels(dto.level);
    if (levels) where.level = Array.isArray(levels) ? { in: levels } : levels;
    if (dto.startTime || dto.endTime) {
      where.timestamp = { ...(dto.startTime && { gte: dto.startTime }), ...(dto.endTime && { lte: dto.endTime }) };
    }
    if (dto.search) where.message = { contains: dto.search, mode: 'insensitive' };

    const limit = dto.limit || 100;
    const logs = await this.prisma.logEntry.findMany({
      where,
      orderBy: { timestamp: 'desc' },
      take: limit + 1,
      ...(dto.cursor && { cursor: { id: dto.cursor }, skip: 1 }),
    });

    const hasMore = logs.length > limit;
    if (hasMore) logs.pop();

    return { stream: stream.name, logs: logs.reverse(), nextCursor: hasMore ? logs[logs.length - 1]?.id : null };
  }

  async getLogStats(projectId: string, streamName?: string) {
    const where: Record<string, unknown> = { stream: { projectId } };
    if (streamName) {
      where.stream = UUID_RE.test(streamName) ? { projectId, id: streamName } : { projectId, name: streamName };
    }

    const [total, debugCount, infoCount, warnCount, errorCount, fatalCount, streamCount] = await Promise.all([
      this.prisma.logEntry.count({ where }),
      this.prisma.logEntry.count({ where: { ...where, level: 'debug' } }),
      this.prisma.logEntry.count({ where: { ...where, level: 'info' } }),
      this.prisma.logEntry.count({ where: { ...where, level: 'warn' } }),
      this.prisma.logEntry.count({ where: { ...where, level: 'error' } }),
      this.prisma.logEntry.count({ where: { ...where, level: 'fatal' } }),
      this.prisma.logStream.count({ where: { projectId } }),
    ]);

    return { total, byLevel: { debug: debugCount, info: infoCount, warn: warnCount, error: errorCount, fatal: fatalCount }, streamCount };
  }
}
