/**
 * Phase 21 — Templates SDK module.
 */
import type { FidscriptClient } from '../client.js';

export interface TemplateVariable {
  name: string;
  description?: string;
  defaultValue?: string;
  required?: boolean;
}

export interface Template {
  id: string;
  projectId: string;
  name: string;
  description?: string;
  category: string;
  content: string;
  variables: TemplateVariable[];
  isPublic: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface GenerateAndDeployResult {
  project: { id: string; name: string; slug: string };
  deployment: { id: string; status: string };
  archiveKey: string;
}

export class TemplatesModule {
  constructor(private client: FidscriptClient) {}

  /**
   * List templates available for a project (own + public).
   */
  async list(projectId: string, category?: string) {
    const params = category ? `?category=${category}` : '';
    return this.client.get<Template[]>(`/projects/${projectId}/templates${params}`);
  }

  /**
   * Get a single template.
   */
  async get(projectId: string, templateId: string) {
    return this.client.get<Template>(`/projects/${projectId}/templates/${templateId}`);
  }

  /**
   * List template categories.
   */
  async listCategories() {
    const res = await this.client.get<{ categories: string[] }>(`/projects/00000000-0000-0000-0000-000000000000/templates/categories`);
    return res.categories ?? [];
  }

  /**
   * Generate a project from a template (renders files, creates Project).
   * Returns the rendered file list without deploying.
   */
  async generate(projectId: string, templateId: string, name: string, variables: Record<string, string>) {
    return this.client.post<{ project: { id: string; name: string; slug: string }; files: unknown[]; templateName: string }>(
      `/projects/${projectId}/templates/generate`,
      { templateId, name, variables },
    );
  }

  /**
   * Generate and immediately deploy a project from a template.
   * Full pipeline: render → upload tarball → create deployment.
   */
  async generateAndDeploy(projectId: string, templateId: string, name: string, variables: Record<string, string>) {
    return this.client.post<GenerateAndDeployResult>(
      `/projects/${projectId}/templates/generate-and-deploy`,
      { templateId, name, variables },
    );
  }
}
