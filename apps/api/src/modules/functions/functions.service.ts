import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import { EventService } from '../events/event.service';
import { Runtime, RUNTIME } from './runtimes/runtime.interface';
import {
  CreateFunctionDto,
  UpdateFunctionDto,
  DeployFunctionDto,
  InvokeFunctionDto,
} from './dto/index';
import * as fs from 'fs/promises';
import * as path from 'path';

@Injectable()
export class FunctionsService {
  private functionsPath: string;

  constructor(
    private prisma: PrismaService,
    private configService: ConfigService,
    private eventService: EventService,
    @Inject(RUNTIME) private runtime: Runtime,
  ) {
    this.functionsPath = this.configService.get('FUNCTIONS_PATH', '/tmp/functions');
  }

  async createFunction(projectId: string, dto: CreateFunctionDto) {
    const func = await this.prisma.function.create({
      data: {
        projectId,
        name: dto.name,
        runtime: dto.runtime,
        entryPoint: dto.entryPoint || 'handler',
        memoryMb: dto.memoryMb || 256,
        timeoutSeconds: dto.timeoutSeconds || 30,
        envVars: dto.envVars || {},
        status: 'created',
      },
    });

    await this.eventService.emit('function.created', {
      functionId: func.id,
      projectId,
      name: dto.name,
    });

    return func;
  }

  async listFunctions(projectId: string) {
    return this.prisma.function.findMany({
      where: { projectId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getFunction(projectId: string, functionId: string) {
    const func = await this.prisma.function.findFirst({
      where: { id: functionId, projectId },
    });
    if (!func) throw new NotFoundException('Function not found');
    return func;
  }

  async updateFunction(projectId: string, functionId: string, dto: UpdateFunctionDto) {
    const func = await this.prisma.function.findFirst({
      where: { id: functionId, projectId },
    });
    if (!func) throw new NotFoundException('Function not found');

    return this.prisma.function.update({
      where: { id: functionId },
      data: {
        memoryMb: dto.memoryMb ?? func.memoryMb,
        timeoutSeconds: dto.timeoutSeconds ?? func.timeoutSeconds,
        envVars: (dto.envVars ?? func.envVars) as any,
        settings: (dto.settings ?? func.settings) as any,
      },
    });
  }

  async deleteFunction(projectId: string, functionId: string) {
    const func = await this.prisma.function.findFirst({
      where: { id: functionId, projectId },
    });
    if (!func) throw new NotFoundException('Function not found');

    await this.prisma.function.delete({ where: { id: functionId } });
    await this.eventService.emit('function.deleted', { functionId, projectId });

    return { deleted: true };
  }

  async deployFunction(projectId: string, functionId: string, dto: DeployFunctionDto) {
    const func = await this.prisma.function.findFirst({
      where: { id: functionId, projectId },
    });
    if (!func) throw new NotFoundException('Function not found');

    // Save code to functions path
    const functionDir = path.join(this.functionsPath, projectId, functionId);
    await fs.mkdir(functionDir, { recursive: true });

    const ext = func.runtime === 'nodejs' ? 'js' : func.runtime === 'python' ? 'py' : 'txt';
    const handlerFile = path.join(functionDir, `handler.${ext}`);
    await fs.writeFile(handlerFile, dto.code);

    // Build the function
    await this.runtime.build(functionDir, func.envVars as Record<string, string>);

    // Update version
    const version = dto.version || `${Date.now()}`;
    await this.prisma.function.update({
      where: { id: functionId },
      data: {
        currentVersion: version,
        status: 'deployed',
      },
    });

    await this.eventService.emit('function.deployed', {
      functionId,
      projectId,
      version,
    });

    return { deployed: true, version };
  }

  async invokeFunction(projectId: string, functionId: string, dto: InvokeFunctionDto) {
    const func = await this.prisma.function.findFirst({
      where: { id: functionId, projectId },
    });
    if (!func) throw new NotFoundException('Function not found');

    const functionDir = path.join(this.functionsPath, projectId, functionId);
    const payload = typeof dto.payload === 'string' ? dto.payload : JSON.stringify(dto.payload || {});

    const result = await this.runtime.invoke(functionDir, payload, func.timeoutSeconds);

    // Log invocation
    await this.prisma.functionLog.create({
      data: {
        functionId,
        version: func.currentVersion || 'unknown',
        status: result.success ? 'success' : 'error',
        durationMs: result.durationMs,
        memoryUsedMb: result.memoryUsedMb,
        requestPayload: payload,
        responseOutput: result.output,
        errorMessage: result.error,
      },
    });

    await this.eventService.emit(result.success ? 'function.invoked' : 'function.error', {
      functionId,
      projectId,
      success: result.success,
    });

    return result;
  }

  async getFunctionLogs(projectId: string, functionId: string, limit = 50, cursor?: string) {
    const func = await this.prisma.function.findFirst({
      where: { id: functionId, projectId },
    });
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
    const func = await this.prisma.function.findFirst({
      where: { id: functionId, projectId },
    });
    if (!func) throw new NotFoundException('Function not found');

    return this.prisma.functionLog.findMany({
      where: { functionId },
      select: { version: true, createdAt: true, status: true },
      distinct: ['version'],
      orderBy: { createdAt: 'desc' },
    });
  }
}