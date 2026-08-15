/**
 * Email template service — facade.
 *
 * Split into:
 *   - EmailTemplateCrudService — create / list / get / update / delete
 *   - EmailTemplateRenderService — render + validate variables
 *
 * Existing controllers and the EmailTemplateController depend on this
 * facade for the unified public surface.
 */
import { Injectable } from '@nestjs/common';
import { EmailTemplateCrudService } from './email-template-crud.service';
import { EmailTemplateRenderService, TemplateVariable, RenderResult } from './email-template-render.service';

@Injectable()
export class EmailTemplateService {
  constructor(
    private readonly crud: EmailTemplateCrudService,
    private readonly renderer: EmailTemplateRenderService,
  ) {}

  // ── CRUD ─────────────────────────────────────────────────────────────
  create = (projectId: string, dto: Parameters<EmailTemplateCrudService['create']>[1]) =>
    this.crud.create(projectId, dto);
  list = (projectId: string) => this.crud.list(projectId);
  get = (projectId: string, templateId: string) => this.crud.get(projectId, templateId);
  update = (
    projectId: string,
    templateId: string,
    dto: Parameters<EmailTemplateCrudService['update']>[2],
  ) => this.crud.update(projectId, templateId, dto);
  delete = (projectId: string, templateId: string) => this.crud.delete(projectId, templateId);

  // ── Rendering + Validation ───────────────────────────────────────────
  render = (
    template: { subject: string; htmlBody?: string | null; textBody?: string | null },
    variables: Record<string, string>,
  ): RenderResult => this.renderer.render(template, variables);

  validateVariables = (template: { variables: TemplateVariable[] }, provided: Record<string, string>) =>
    this.renderer.validateVariables(template, provided);

  async preview(projectId: string, templateId: string) {
    const template = await this.crud.get(projectId, templateId);
    const vars: Record<string, string> = {};
    const varsList = (template.variables as unknown as TemplateVariable[]) ?? [];
    for (const v of varsList) {
      vars[v.name] = v.default ?? `[${v.name}]`;
    }
    return {
      template: {
        id: template.id, name: template.name, subject: template.subject,
        htmlBody: template.htmlBody, textBody: template.textBody, variables: template.variables,
      },
      rendered: this.renderer.render(template, vars),
    };
  }
}

export { TemplateVariable, RenderResult } from './email-template-render.service';
