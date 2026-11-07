import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { EventService } from '@/modules/events/event.service';
import { CreateFunctionDto, UpdateFunctionDto } from '@/modules/functions/dto/index';
import { FunctionsVarsService } from '@/modules/functions/services/functions-vars.service';

@Injectable()
export class FunctionsCrudService {
  constructor(
    private prisma: PrismaService,
    private eventService: EventService,
    private vars: FunctionsVarsService,
  ) {}

  async createFunction(projectId: string, dto: CreateFunctionDto) {
    const func = await this.prisma.function.create({
      data: {
        projectId, name: dto.name, runtime: dto.runtime,
        entryPoint: dto.entryPoint || 'handler',
        memoryMb: dto.memoryMb || 256, timeoutSeconds: dto.timeoutSeconds || 30,
        // The function's variables are secrets (API keys, tokens). They are
        // stored encrypted, like the project's own variables.
        envVars: this.vars.encrypt(dto.envVars || {}), status: 'created',
      },
    });
    await this.eventService.emit('function.created', projectId, { functionId: func.id, name: dto.name });
    // The caller already knows what they sent; the answer does not repeat it.
    return this.present(func, false);
  }

  /**
   * The functions of a project, with their variables masked unless the
   * caller may read them.
   *
   * The variables are the function's secrets — the API keys it calls with.
   * They are shown only to the people who administer the project: a member
   * who can only read the project has no business reading another member's
   * credentials.
   */
  async listFunctions(projectId: string, canSeeSecrets = false) {
    const funcs = await this.prisma.function.findMany({
      where: { projectId },
      orderBy: { createdAt: 'desc' },
    });
    return funcs.map((f) => this.present(f, canSeeSecrets));
  }

  async getFunction(projectId: string, functionId: string, canSeeSecrets = false) {
    const func = await this.prisma.function.findFirst({ where: { id: functionId, projectId } });
    if (!func) throw new NotFoundException('Function not found');
    return this.present(func, canSeeSecrets);
  }

  /** The function's variables, decrypted — for the runtime, not for a page. */
  async getFunctionWithSecrets(projectId: string, functionId: string) {
    const func = await this.prisma.function.findFirst({ where: { id: functionId, projectId } });
    if (!func) throw new NotFoundException('Function not found');
    return { ...func, envVars: this.vars.decrypt((func.envVars as Record<string, string>) ?? {}) };
  }

  async updateFunction(projectId: string, functionId: string, dto: UpdateFunctionDto) {
    const func = await this.prisma.function.findFirst({ where: { id: functionId, projectId } });
    if (!func) throw new NotFoundException('Function not found');
    const stored = (func.envVars ?? {}) as Record<string, string>;
    return this.prisma.function.update({
      where: { id: functionId },
      data: {
        memoryMb: dto.memoryMb ?? func.memoryMb,
        timeoutSeconds: dto.timeoutSeconds ?? func.timeoutSeconds,
        envVars: dto.envVars ? this.vars.merge(dto.envVars, stored) : stored,
        settings: (dto.settings ?? func.settings) as any,
        currentVersion: dto.currentVersion ?? func.currentVersion,
      },
    });
  }

  async deleteFunction(projectId: string, functionId: string) {
    const func = await this.prisma.function.findFirst({ where: { id: functionId, projectId } });
    if (!func) throw new NotFoundException('Function not found');
    await this.prisma.function.delete({ where: { id: functionId } });
    await this.eventService.emit('function.deleted', projectId, { functionId });
    return { deleted: true };
  }

  /** The function as a page sees it: the variables masked unless allowed. */
  private present(func: any, canSeeSecrets: boolean) {
    const stored = (func.envVars ?? {}) as Record<string, string>;
    return { ...func, envVars: this.vars.present(stored, canSeeSecrets) };
  }
}
