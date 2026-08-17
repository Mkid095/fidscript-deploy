/**
 * Email template CRUD — create / list / get / update / soft-delete.
 * Soft-delete (isActive=false) is used so audit and historical sends keep
 * the template reference.
 */
import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { EventService } from '@/modules/events/event.service';
import { TemplateVariable } from './email-template-render.service';

@Injectable()
export class EmailTemplateCrudService {
  constructor(
    private prisma: PrismaService,
    private events: EventService,
  ) {}

  async create(projectId: string, dto: {
    name: string;
    description?: string;
    fromAddress?: string;
    fromName?: string;
    subject: string;
    htmlBody?: string;
    textBody?: string;
    variables?: TemplateVariable[];
  }) {
    const existing = await this.prisma.emailTemplate.findUnique({
      where: { projectId_name: { projectId, name: dto.name } },
    });
    if (existing) {
      throw new BadRequestException(`Template "${dto.name}" already exists in this project`);
    }

    const template = await this.prisma.emailTemplate.create({
      data: {
        projectId,
        name: dto.name,
        description: dto.description,
        fromAddress: dto.fromAddress,
        fromName: dto.fromName,
        subject: dto.subject,
        htmlBody: dto.htmlBody,
        textBody: dto.textBody,
        variables: (dto.variables ?? []) as object,
      },
    });

    await this.events.emit('email.template_created', projectId, {
      templateId: template.id,
      name: template.name,
    }, {});

    return template;
  }

  async list(projectId: string) {
    return this.prisma.emailTemplate.findMany({
      where: { projectId, isActive: true },
      orderBy: { name: 'asc' },
      select: {
        id: true, name: true, description: true, fromAddress: true, fromName: true,
        subject: true, variables: true, isActive: true, createdAt: true, updatedAt: true,
      },
    });
  }

  async get(projectId: string, templateId: string) {
    const template = await this.prisma.emailTemplate.findFirst({
      where: { id: templateId, projectId },
    });
    if (!template) throw new NotFoundException('Template not found');
    return template;
  }

  async update(projectId: string, templateId: string, dto: {
    description?: string;
    fromAddress?: string;
    fromName?: string;
    subject?: string;
    htmlBody?: string;
    textBody?: string;
    variables?: TemplateVariable[];
    isActive?: boolean;
  }) {
    await this.get(projectId, templateId); // guards 404
    const template = await this.prisma.emailTemplate.update({
      where: { id: templateId },
      data: dto as object,
    });
    await this.events.emit('email.template_updated', projectId, {
      templateId,
      name: template.name,
    }, {});
    return template;
  }

  async delete(projectId: string, templateId: string) {
    await this.get(projectId, templateId); // guards 404
    await this.prisma.emailTemplate.update({
      where: { id: templateId },
      data: { isActive: false },
    });
    await this.events.emit('email.template_deleted', projectId, { templateId }, {});
    return { deleted: true };
  }
}
