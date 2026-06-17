import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { EventService } from '@/modules/events/event.service';
import { SandboxedRunnerService } from './sandboxed-runner.service';
import { NodeJsRuntime } from '@/modules/functions/runtimes/nodejs.runtime';
import { PythonRuntime } from '@/modules/functions/runtimes/python.runtime';
import { DeployFunctionDto, InvokeFunctionDto } from '@/modules/functions/dto/index';
import * as fs from 'fs/promises';
import * as path from 'path';

@Injectable()
export class FunctionsRuntimeService {
  private readonly functionsPath: string;

  constructor(
    private prisma: PrismaService,
    private eventService: EventService,
    private sandbox: SandboxedRunnerService,
    private nodeRuntime: NodeJsRuntime,
    private pythonRuntime: PythonRuntime,
  ) {
    this.functionsPath = process.env.FUNCTIONS_PATH ?? '/tmp/functions';
  }

  async deployFunction(projectId: string, functionId: string, dto: DeployFunctionDto) {
    const func = await this.prisma.function.findFirst({ where: { id: functionId, projectId } });
    if (!func) throw new NotFoundException('Function not found');

    const functionDir = path.join(this.functionsPath, projectId, functionId);
    await fs.mkdir(functionDir, { recursive: true });

    const ext = func.runtime === 'nodejs' ? 'js' : func.runtime === 'python' ? 'py' : 'txt';
    await fs.writeFile(path.join(functionDir, `handler.${ext}`), dto.code, { mode: 0o444 });

    // Validate syntax
    const runtime = func.runtime === 'nodejs' ? this.nodeRuntime : this.pythonRuntime;
    if (!runtime.validateCode(dto.code)) {
      throw new NotFoundException(`Invalid ${func.runtime} code`);
    }

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
    const payload = typeof dto.payload === 'string' ? dto.payload : JSON.stringify(dto.payload ?? {});

    // Inject project env vars (decrypted at runtime — Phase 04 CryptoService)
    const envVars = (func.envVars as Record<string, string>) ?? {};

    const result = await this.sandbox.run({
      code: await fs.readFile(path.join(functionDir, `handler.${func.runtime === 'nodejs' ? 'js' : 'py'}`), 'utf8'),
      runtime: func.runtime as 'nodejs' | 'python',
      entryPoint: func.entryPoint || 'handler',
      payload,
      envVars,
      memoryMb: func.memoryMb,
      timeoutSeconds: func.timeoutSeconds,
    });

    await this.prisma.functionLog.create({
      data: {
        functionId,
        version: func.currentVersion || 'unknown',
        status: result.success ? 'success' : 'error',
        durationMs: result.durationMs,
        memoryUsedMb: Math.round(result.durationMs / 1000), // placeholder
        requestPayload: payload,
        responseOutput: result.output,
        errorMessage: result.error,
      },
    });

    await this.eventService.emit(result.success ? 'function.invoked' : 'function.error', {
      functionId, projectId, success: result.success,
    });

    return result;
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
}