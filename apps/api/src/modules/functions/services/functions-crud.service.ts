import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { EventService } from '@/modules/events/event.service';
import { CreateFunctionDto, UpdateFunctionDto } from '@/modules/functions/dto/index';

@Injectable()
export class FunctionsCrudService {
  constructor(private prisma: PrismaService, private eventService: EventService) {}

  async createFunction(projectId: string, dto: CreateFunctionDto) {
    const func = await this.prisma.function.create({
      data: {
        projectId, name: dto.name, runtime: dto.runtime,
        entryPoint: dto.entryPoint || 'handler',
        memoryMb: dto.memoryMb || 256, timeoutSeconds: dto.timeoutSeconds || 30,
        envVars: dto.envVars || {}, status: 'created',
      },
    });
    await this.eventService.emit('function.created', { functionId: func.id, projectId, name: dto.name });
    return func;
  }

  async listFunctions(projectId: string) {
    return this.prisma.function.findMany({ where: { projectId }, orderBy: { createdAt: 'desc' } });
  }

  async getFunction(projectId: string, functionId: string) {
    const func = await this.prisma.function.findFirst({ where: { id: functionId, projectId } });
    if (!func) throw new NotFoundException('Function not found');
    return func;
  }

  async updateFunction(projectId: string, functionId: string, dto: UpdateFunctionDto) {
    const func = await this.prisma.function.findFirst({ where: { id: functionId, projectId } });
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
    const func = await this.prisma.function.findFirst({ where: { id: functionId, projectId } });
    if (!func) throw new NotFoundException('Function not found');
    await this.prisma.function.delete({ where: { id: functionId } });
    await this.eventService.emit('function.deleted', { functionId, projectId });
    return { deleted: true };
  }
}
