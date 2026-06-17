import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';

@Injectable()
export class LogWriteService {
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
}