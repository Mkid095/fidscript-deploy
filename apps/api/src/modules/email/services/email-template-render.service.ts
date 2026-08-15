/**
 * Email template rendering + variable validation.
 *
 * Renders a template by interpolating Handlebars-style `{{name}}` placeholders
 * with values supplied by the caller. Pure functions — no I/O — so this can
 * be unit-tested in isolation and called from any pipeline.
 */
import { Injectable, BadRequestException } from '@nestjs/common';

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
export class EmailTemplateRenderService {
  /**
   * Render a template with the given variables.
   * Uses simple Handlebars-style interpolation: {{name}} → value
   */
  render(
    template: { subject: string; htmlBody?: string | null; textBody?: string | null },
    variables: Record<string, string>,
  ): RenderResult {
    const interpolate = (text: string, vars: Record<string, string>): string =>
      text.replace(/\{\{(\w+)\}\}/g, (_, key) => vars[key] ?? `{{${key}}}`);

    return {
      subject: interpolate(template.subject, variables),
      html: template.htmlBody ? interpolate(template.htmlBody, variables) : null,
      text: template.textBody ? interpolate(template.textBody, variables) : null,
    };
  }

  /**
   * Validate that all required variables are present before sending.
   */
  validateVariables(
    template: { variables: TemplateVariable[] },
    provided: Record<string, string>,
  ): void {
    const missing: string[] = [];
    for (const v of template.variables) {
      if (v.required && !provided[v.name] && v.default === undefined) {
        missing.push(v.name);
      }
    }
    if (missing.length) {
      throw new BadRequestException(`Missing required template variables: ${missing.join(', ')}`);
    }
  }
}
