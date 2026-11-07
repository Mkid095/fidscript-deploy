import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { parseLevels } from './log-query-filters';

@Injectable()
export class LogBuildQueryService {
  constructor(private prisma: PrismaService) {}

  buildWhere(streamId: string, dto: any): any {
    const where: any = { streamId };
    const levels = parseLevels(dto.level);
    if (levels) where.level = Array.isArray(levels) ? { in: levels } : levels;
    if (dto.startTime || dto.endTime) {
      where.timestamp = {};
      if (dto.startTime) where.timestamp.gte = dto.startTime;
      if (dto.endTime) where.timestamp.lte = dto.endTime;
    }
    if (dto.search) where.message = { contains: dto.search, mode: 'insensitive' };
    return where;
  }

  paginate(query: any, limit: number, cursor?: string) {
    return {
      ...query,
      take: limit + 1,
      ...(cursor && { cursor: { id: cursor }, skip: 1 }),
    };
  }
}
