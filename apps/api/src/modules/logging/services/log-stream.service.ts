import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';

@Injectable()
export class LogStreamService {
  constructor(private prisma: PrismaService) {}

  async createLogStream(projectId: string, dto: { name: string; type: string; retentionDays?: number }) {
    const existing = await this.prisma.logStream.findFirst({
      where: { projectId, name: dto.name },
    });
    if (existing) throw new Error('Log stream already exists');

    const stream = await this.prisma.logStream.create({
      data: {
        projectId,
        name: dto.name,
        type: dto.type,
        retentionDays: dto.retentionDays || 30,
      },
    });

    return stream;
  }

  async listLogStreams(projectId: string) {
    return this.prisma.logStream.findMany({
      where: { projectId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getLogStream(projectId: string, streamId: string) {
    const stream = await this.prisma.logStream.findFirst({
      where: { id: streamId, projectId },
    });
    if (!stream) throw new NotFoundException('Log stream not found');
    return stream;
  }

  async deleteLogStream(projectId: string, streamId: string) {
    const stream = await this.prisma.logStream.findFirst({
      where: { id: streamId, projectId },
    });
    if (!stream) throw new NotFoundException('Log stream not found');

    await this.prisma.logStream.delete({ where: { id: streamId } });
    await this.prisma.logEntry.deleteMany({ where: { streamId } });

    return { deleted: true };
  }
}
