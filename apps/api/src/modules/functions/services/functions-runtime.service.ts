import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { InstantAppConfigService } from '@/modules/instant/services/instant-app-config.service';
import { EventService } from '@/modules/events/event.service';
import { SandboxedRunnerService } from './sandboxed-runner.service';
import { FunctionsCrudService } from './functions-crud.service';
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
    private instantConfig: InstantAppConfigService,
    private crud: FunctionsCrudService,
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

    // Save versioned snapshot (readable but not the active handler)
    await fs.writeFile(path.join(functionDir, `handler.v${version}.${ext}`), dto.code, { mode: 0o444 });

    await this.prisma.function.update({
      where: { id: functionId },
      data: { currentVersion: version, status: 'deployed' },
    });

    await this.eventService.emit('function.deployed', projectId, { functionId, version });
    return { deployed: true, version };
  }

  async invokeFunction(projectId: string, functionId: string, dto: InvokeFunctionDto) {
    // The runtime needs the function's REAL variables — they are the
    // credentials it calls with. They are stored encrypted, so they are
    // decrypted here and here only.
    const func = await this.crud.getFunctionWithSecrets(projectId, functionId);

    const functionDir = path.join(this.functionsPath, projectId, functionId);
    const payload = typeof dto.payload === 'string' ? dto.payload : JSON.stringify(dto.payload ?? {});

    // The function's own env vars — decrypted, for the sandbox only.
    const envVars = { ...((func.envVars as Record<string, string>) ?? {}) };

    // Link the function to the project's data plane. A function is part of
    // the application, so it reaches the application's Instant app the same
    // way a deployed container does — under the names Instant's own SDK
    // reads. A variable the function has set itself is left alone.
    const instantEnv = await this.instantConfig.environmentFor(projectId);
    if (instantEnv) {
      for (const [key, value] of Object.entries(instantEnv)) {
        if (!(key in envVars)) envVars[key] = value;
      }
    }

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

    await this.eventService.emit(result.success ? 'function.invoked' : 'function.error', projectId, {
      functionId, success: result.success,
    });

    return result;
  }
}
