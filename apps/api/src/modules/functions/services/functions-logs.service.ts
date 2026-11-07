import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import * as fs from 'fs/promises';
import * as path from 'path';

/**
 * What a function has already done — its logs, its versions and its code.
 *
 * Reading a function's history is a different job from running it, and it
 * does not need the sandbox, the runtimes or the project's data plane.
 */
@Injectable()
export class FunctionsLogsService {
  private readonly functionsPath: string;

  constructor(private prisma: PrismaService) {
    this.functionsPath = process.env.FUNCTIONS_PATH ?? '/tmp/functions';
  }

  async getFunctionLogs(projectId: string, functionId: string, limit = 50, cursor?: string) {
    const func = await this.prisma.function.findFirst({ where: { id: functionId, projectId } });
    if (!func) throw new NotFoundException('Function not found');

    const logs = await this.prisma.functionLog.findMany({
      where: { functionId },
      orderBy: { createdAt: 'desc' },
      take: limit + 1,
      ...(cursor && { cursor: { id: cursor }, skip: 1 }),
    });
    const hasMore = logs.length > limit;
    if (hasMore) logs.pop();
    return { logs: logs.reverse(), nextCursor: hasMore ? logs[logs.length - 1]?.id : null };
  }

  async getFunctionVersions(projectId: string, functionId: string) {
    const func = await this.prisma.function.findFirst({ where: { id: functionId, projectId } });
    if (!func) throw new NotFoundException('Function not found');
    return this.prisma.functionLog.findMany({
      where: { functionId },
      select: { version: true, createdAt: true, status: true },
      distinct: ['version'],
      orderBy: { createdAt: 'desc' },
    });
  }

  async getFunctionCode(projectId: string, functionId: string, version?: string) {
    const func = await this.prisma.function.findFirst({ where: { id: functionId, projectId } });
    if (!func) throw new NotFoundException('Function not found');
    const ext = func.runtime === 'nodejs' ? 'js' : func.runtime === 'python' ? 'py' : 'txt';
    const functionDir = path.join(this.functionsPath, projectId, functionId);

    async function fileExists(p: string) {
      try { await fs.access(p, fs.constants.F_OK); return true; } catch { return false; }
    }

    if (version) {
      const versionedPath = path.join(functionDir, `handler.v${version}.${ext}`);
      if (await fileExists(versionedPath)) {
        return { code: await fs.readFile(versionedPath, 'utf8'), versioned: true };
      }
    }
    const currentPath = path.join(functionDir, `handler.${ext}`);
    if (await fileExists(currentPath)) {
      return { code: await fs.readFile(currentPath, 'utf8'), versioned: false };
    }
    return { code: null, versioned: false };
  }
}
