import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';

@Injectable()
export class LogBuildQueryService {
  constructor(private prisma: PrismaService) {}

  buildWhere(streamId: string, dto: any): any {
    const where: any = { streamId };
    if (dto.level) where.level = dto.level;
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
