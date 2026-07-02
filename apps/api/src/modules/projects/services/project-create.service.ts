import { Injectable, ConflictException } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { EventService } from '@/modules/events/event.service';
import { CreateProjectDto } from '@/modules/projects/dto/index';
import { ProjectFormatService } from './project-format.service';
import * as crypto from 'crypto';

@Injectable()
export class ProjectCreateService {
  constructor(
    private prisma: PrismaService,
    private eventService: EventService,
    private format: ProjectFormatService,
  ) {}

  async create(userId: string, dto: CreateProjectDto) {
    const slug = this.generateSlug(dto.name);
    const existing = await this.prisma.project.findUnique({ where: { slug } });
    if (existing) throw new ConflictException('Project with this name already exists');

    const project = await this.prisma.project.create({
      data: {
        name: dto.name, slug, description: dto.description,
        type: dto.type.toUpperCase() as any, ownerId: userId,
        region: dto.region, subdomain: slug,
      },
      include: { settings: true },
    });

    await this.prisma.projectSettings.create({ data: { projectId: project.id } });

    await this.eventService.emit('projects.project.created', project.id, {
      name: project.name,
      slug: project.slug,
    });

    return this.format.formatProject(project);
  }

  async clone(userId: string, projectId: string, dto: any, findWithAccess: (u: string, p: string) => Promise<any>) {
    const source = await findWithAccess(userId, projectId);
    const slug = this.generateSlug(dto.name);
    const existing = await this.prisma.project.findUnique({ where: { slug } });
    if (existing) throw new ConflictException('Project with this name already exists');

    const project = await this.prisma.project.create({
      data: {
        name: dto.name, slug, description: source.description,
        type: source.type, ownerId: userId, region: source.region,
        buildSettings: source.buildSettings as any,
        deploymentStrategy: source.deploymentStrategy,
        sourceProvider: source.sourceProvider,
        sourceRepo: source.sourceRepo,
        sourceBranch: source.sourceBranch,
      },
    });

    await this.prisma.projectSettings.create({ data: { projectId: project.id } });

    const envVars = await this.prisma.projectEnv.findMany({ where: { projectId } });
    for (const envVar of envVars) {
      await this.prisma.projectEnv.create({
        data: { projectId: project.id, key: envVar.key, value: envVar.value },
      });
    }

    await this.eventService.emit('projects.project.cloned', project.id, {
      sourceProjectId: projectId,
    });

    return this.format.formatProject(project);
  }

  private generateSlug(name: string): string {
    const base = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').substring(0, 50);
    return `${base}-${Math.random().toString(36).substring(2, 8)}`;
  }
}
