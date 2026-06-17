import { Injectable, NotFoundException, Inject } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '@/prisma/prisma.service';
import { EventService } from '@/modules/events/event.service';
import { Runtime, RUNTIME } from '@/modules/functions/runtimes/runtime.interface';
import { DeployFunctionDto, InvokeFunctionDto } from '@/modules/functions/dto/index';
import * as fs from 'fs/promises';
import * as path from 'path';

@Injectable()
export class FunctionsRuntimeService {
  private functionsPath: string;

  constructor(
    private prisma: PrismaService,
    private configService: ConfigService,
    private eventService: EventService,
    @Inject(RUNTIME) private runtime: Runtime,
  ) {
    this.functionsPath = this.configService.get('FUNCTIONS_PATH', '/tmp/functions');
  }

  async deployFunction(projectId: string, functionId: string, dto: DeployFunctionDto) {
    const func = await this.prisma.function.findFirst({ where: { id: functionId, projectId } });
    if (!func) throw new NotFoundException('Function not found');

    const functionDir = path.join(this.functionsPath, projectId, functionId);
    await fs.mkdir(functionDir, { recursive: true });
    const ext = func.runtime === 'nodejs' ? 'js' : func.runtime === 'python' ? 'py' : 'txt';
    await fs.writeFile(path.join(functionDir, `handler.${ext}`), dto.code);
    await this.runtime.build(functionDir, func.envVars as Record<string, string>);

    const version = dto.version || `${Date.now()}`;
    await this.prisma.function.update({
      where: { id: functionId },
      data: { currentVersion: version, status: 'deployed' },
    });

    await this.eventService.emit('function.deployed', { functionId, projectId, version });
    return { deployed: true, version };
  }

  async invokeFunction(projectId: string, functionId: string, dto: InvokeFunctionDto) {
    const func = await this.prisma.function.findFirst({ where: { id: functionId, projectId } });
    if (!func) throw new NotFoundException('Function not found');

    const functionDir = path.join(this.functionsPath, projectId, functionId);
    const payload = typeof dto.payload === 'string' ? dto.payload : JSON.stringify(dto.payload || {});
    const result = await this.runtime.invoke(functionDir, payload, func.timeoutSeconds);

    await this.prisma.functionLog.create({
      data: {
        functionId, version: func.currentVersion || 'unknown',
        status: result.success ? 'success' : 'error', durationMs: result.durationMs,
        memoryUsedMb: result.memoryUsedMb, requestPayload: payload,
        responseOutput: result.output, errorMessage: result.error,
      },
    });

    await this.eventService.emit(result.success ? 'function.invoked' : 'function.error', { functionId, projectId, success: result.success });
    return result;
  }

  async getFunctionLogs(projectId: string, functionId: string, limit = 50, cursor?: string) {
    const func = await this.prisma.function.findFirst({ where: { id: functionId, projectId } });
    if (!func) throw new NotFoundException('Function not found');

    const logs = await this.prisma.functionLog.findMany({
      where: { functionId }, orderBy: { createdAt: 'desc' }, take: limit + 1,
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
      where: { functionId }, select: { version: true, createdAt: true, status: true },
      distinct: ['version'], orderBy: { createdAt: 'desc' },
    });
  }
}
