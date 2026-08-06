import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';

const INTERVALS: Record<string, number> = {
  '5m': 5 * 60 * 1000,
  '15m': 15 * 60 * 1000,
  '1h': 60 * 60 * 1000,
  '6h': 6 * 60 * 60 * 1000,
  '24h': 24 * 60 * 60 * 1000,
};

@Injectable()
export class LogTimelineService {
  constructor(private prisma: PrismaService) {}

  async getLogTimeline(projectId: string, streamName: string, interval = '1h') {
    const stream = await this.prisma.logStream.findUnique({
      where: { projectId_name: { projectId, name: streamName } },
    });
    if (!stream) throw new NotFoundException('Log stream not found');

    const bucketMs = INTERVALS[interval] || INTERVALS['1h'];
    const startTime = new Date(Date.now() - bucketMs);

    const logs = await this.prisma.logEntry.findMany({
      where: { streamId: stream.id, timestamp: { gte: startTime } },
      select: { timestamp: true, level: true },
      orderBy: { timestamp: 'asc' },
    });

    const buckets = new Map<string, { debug: number; info: number; warn: number; error: number; fatal: number }>();

    for (const log of logs) {
      const bucketTime = new Date(Math.floor(log.timestamp.getTime() / bucketMs) * bucketMs);
      const key = bucketTime.toISOString();
      const entry = buckets.get(key) ?? { debug: 0, info: 0, warn: 0, error: 0, fatal: 0 };
      (entry as Record<string, number>)[log.level]++;
      buckets.set(key, entry);
    }

    return {
      stream: streamName,
      interval,
      timeline: Array.from(buckets.entries()).map(([timestamp, counts]) => ({ timestamp, ...counts })),
    };
  }
}
