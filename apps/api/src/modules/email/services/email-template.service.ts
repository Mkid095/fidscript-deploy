/**
 * Transactional email template management.
 *
 * CRUD for EmailTemplate rows + render function that interpolates
 * Handlebars-style variables ({{name}}, {{company}}) into subject + bodies.
 *
 * Templates are project-scoped and never deleted cascade — only soft-disabled.
 */
import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { EventService } from '@/modules/events/event.service';

export interface TemplateVariable {
  name: string;
  required?: boolean;
  default?: string;
}

export interface RenderResult {
  subject: string;
  html: string | null;
  text: string | null;
}

@Injectable()
export class EmailTemplateService {
  constructor(
    private prisma: PrismaService,
    private events: EventService,
  ) {}

  // ── CRUD ──────────────────────────────────────────────────────────

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
    const existing = await (this.prisma as any).emailTemplate.findUnique({
      where: { projectId_name: { projectId, name: dto.name } },
    });
    if (existing) {
      throw new BadRequestException(`Template "${dto.name}" already exists in this project`);
    }

    const template = await (this.prisma as any).emailTemplate.create({
      data: {
        projectId,
        name: dto.name,
        description: dto.description,
        fromAddress: dto.fromAddress,
        fromName: dto.fromName,
        subject: dto.subject,
        htmlBody: dto.htmlBody,
        textBody: dto.textBody,
        variables: dto.variables ?? [],
      },
    });

    await this.events.emit('email.template_created', projectId, {
      templateId: template.id,
      name: template.name,
    }, {});

    return template;
  }

  async list(projectId: string) {
    return (this.prisma as any).emailTemplate.findMany({
      where: { projectId, isActive: true },
      orderBy: { name: 'asc' },
      select: {
        id: true,
        name: true,
        description: true,
        fromAddress: true,
        fromName: true,
        subject: true,
        variables: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  async get(projectId: string, templateId: string) {
    const template = await (this.prisma as any).emailTemplate.findFirst({
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
    const template = await (this.prisma as any).emailTemplate.update({
      where: { id: templateId },
      data: dto,
    });
    await this.events.emit('email.template_updated', projectId, {
      templateId,
      name: template.name,
    }, {});
    return template;
  }

  async delete(projectId: string, templateId: string) {
    await this.get(projectId, templateId); // guards 404
    // Soft-delete: set isActive = false
    await (this.prisma as any).emailTemplate.update({
      where: { id: templateId },
      data: { isActive: false },
    });
    await this.events.emit('email.template_deleted', projectId, { templateId }, {});
    return { deleted: true };
  }

  // ── Rendering ────────────────────────────────────────────────────

  /**
   * Render a template with the given variables.
   * Uses simple Handlebars-style interpolation: {{name}} → value
   */
  render(template: { subject: string; htmlBody?: string | null; textBody?: string | null }, variables: Record<string, string>): RenderResult {
    const interpolate = (text: string, vars: Record<string, string>) =>
      text.replace(/\{\{(\w+)\}\}/g, (_, key) => vars[key] ?? `{{${key}}}`);

    return {
      subject: interpolate(template.subject, variables),
      html: template.htmlBody ? interpolate(template.htmlBody, variables) : null,
      text: template.textBody ? interpolate(template.textBody, variables) : null,
    };
  }

  /**
   * Preview render — renders with a dummy variable set so the caller can
   * see what the output looks like without sending.
   */
  async preview(projectId: string, templateId: string) {
    const template = await this.get(projectId, templateId);
    // Build a dummy variable map from the template's variable definitions
    const vars: Record<string, string> = {};
    for (const v of (template.variables as TemplateVariable[])) {
      vars[v.name] = v.default ?? `[${v.name}]`;
    }
    return {
      template: {
        id: template.id,
        name: template.name,
        subject: template.subject,
        htmlBody: template.htmlBody,
        textBody: template.textBody,
        variables: template.variables,
      },
      rendered: this.render(template, vars),
    };
  }

  /**
   * Validate that all required variables are present before sending.
   */
  validateVariables(template: { variables: TemplateVariable[] }, provided: Record<string, string>) {
    const missing: string[] = [];
    for (const v of (template.variables as TemplateVariable[])) {
      if (v.required && !provided[v.name] && v.default === undefined) {
        missing.push(v.name);
      }
    }
    if (missing.length) {
      throw new BadRequestException(`Missing required template variables: ${missing.join(', ')}`);
    }
  }
}
