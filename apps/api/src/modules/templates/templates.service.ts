import { Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../../prisma/prisma.service.js';
import { EventService } from '../events/event.service.js';
import { CreateTemplateDto, UpdateTemplateDto, GenerateProjectDto } from './dto/index.js';

@Injectable()
export class TemplatesService {
  constructor(
    private prisma: PrismaService,
    private configService: ConfigService,
    private eventService: EventService,
  ) {}

  async createTemplate(projectId: string, dto: CreateTemplateDto) {
    const template = await this.prisma.template.create({
      data: {
        projectId,
        name: dto.name,
        description: dto.description,
        category: dto.category,
        content: dto.content,
        variables: dto.variables || [],
        isPublic: dto.isPublic || false,
      },
    });

    await this.eventService.emit('template.created', { templateId: template.id, projectId });
    return template;
  }

  async listTemplates(projectId: string, category?: string) {
    return this.prisma.template.findMany({
      where: {
        OR: [
          { projectId },
          { isPublic: true },
        ],
        ...(category && { category }),
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getTemplate(projectId: string, templateId: string) {
    const template = await this.prisma.template.findFirst({
      where: {
        id: templateId,
        OR: [{ projectId }, { isPublic: true }],
      },
    });
    if (!template) throw new NotFoundException('Template not found');
    return template;
  }

  async updateTemplate(projectId: string, templateId: string, dto: UpdateTemplateDto) {
    const template = await this.prisma.template.findFirst({
      where: { id: templateId, projectId },
    });
    if (!template) throw new NotFoundException('Template not found');

    return this.prisma.template.update({
      where: { id: templateId },
      data: {
        name: dto.name ?? template.name,
        description: dto.description ?? template.description,
        content: dto.content ?? template.content,
        variables: dto.variables ?? template.variables,
        isPublic: dto.isPublic ?? template.isPublic,
      },
    });
  }

  async deleteTemplate(projectId: string, templateId: string) {
    const template = await this.prisma.template.findFirst({
      where: { id: templateId, projectId },
    });
    if (!template) throw new NotFoundException('Template not found');

    await this.prisma.template.delete({ where: { id: templateId } });
    await this.eventService.emit('template.deleted', { templateId, projectId });
    return { deleted: true };
  }

  async generateProject(projectId: string, dto: GenerateProjectDto) {
    const template = await this.prisma.template.findFirst({
      where: { id: dto.templateId, OR: [{ projectId }, { isPublic: true }] },
    });
    if (!template) throw new NotFoundException('Template not found');

    // Substitute variables in content
    let generatedContent = template.content;
    for (const [key, value] of Object.entries(dto.variables)) {
      generatedContent = generatedContent.replace(new RegExp(`{{${key}}}`, 'g'), value);
    }

    // Create project from generated content
    const project = await this.prisma.project.create({
      data: {
        name: dto.name,
        slug: dto.name.toLowerCase().replace(/\s+/g, '-'),
        projectId,
        type: 'FRONTEND',
        status: 'ACTIVE',
      },
    });

    await this.eventService.emit('template.project_generated', {
      templateId: dto.templateId,
      projectId: project.id,
    });

    return { project, generatedContent };
  }

  async listCategories() {
    const templates = await this.prisma.template.findMany({
      where: { isPublic: true },
      select: { category: true },
      distinct: ['category'],
    });
    return { categories: templates.map(t => t.category) };
  }
}