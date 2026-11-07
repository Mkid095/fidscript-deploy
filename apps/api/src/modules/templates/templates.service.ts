import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { EventService } from '../events/event.service';
import { StorageService } from '../storage/services/storage.service';
import { DeploymentCrudService } from '../deployments/services/deployment-crud.service';
import { ProjectsService } from '../projects/services/projects.service';
import { CreateTemplateDto, UpdateTemplateDto, GenerateProjectDto, GenerateAndDeployDto } from './dto/index';
import { SourceType } from '../deployments/dto/create-deployment.dto';
import * as tar from 'tar-stream';
import * as zlib from 'zlib';
import { promisify } from 'util';
import { ProjectType } from '../projects/dto/create-project.dto';

const gzip = promisify(zlib.gzip);

interface TarEntry { path: string; content: string }

@Injectable()
export class TemplatesService {
  constructor(
    private prisma: PrismaService,
    private eventService: EventService,
    private storageService: StorageService,
    private deploymentCrud: DeploymentCrudService,
    private projectsService: ProjectsService,
  ) {}

  async createTemplate(projectId: string, dto: CreateTemplateDto) {
    const template = await this.prisma.template.create({
      data: {
        projectId,
        name: dto.name,
        description: dto.description,
        category: dto.category,
        content: dto.content,
        variables: (dto.variables || []) as any,
        isPublic: dto.isPublic || false,
      },
    });
    await this.eventService.emit('template.created', projectId, { templateId: template.id });
    return template;
  }

  async listTemplates(projectId: string, category?: string) {
    return this.prisma.template.findMany({
      where: {
        OR: [{ projectId }, { isPublic: true }],
        ...(category && { category }),
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getTemplate(projectId: string, templateId: string) {
    const template = await this.prisma.template.findFirst({
      where: { id: templateId, OR: [{ projectId }, { isPublic: true }] },
    });
    if (!template) throw new NotFoundException('Template not found');
    return template;
  }

  async updateTemplate(projectId: string, templateId: string, dto: UpdateTemplateDto) {
    const template = await this.prisma.template.findFirst({ where: { id: templateId, projectId } });
    if (!template) throw new NotFoundException('Template not found');
    return this.prisma.template.update({
      where: { id: templateId },
      data: {
        name: dto.name ?? template.name,
        description: dto.description ?? template.description,
        content: dto.content ?? template.content,
        variables: (dto.variables ?? template.variables) as any,
        isPublic: dto.isPublic ?? template.isPublic,
      },
    });
  }

  async deleteTemplate(projectId: string, templateId: string) {
    const template = await this.prisma.template.findFirst({ where: { id: templateId, projectId } });
    if (!template) throw new NotFoundException('Template not found');
    await this.prisma.template.delete({ where: { id: templateId } });
    await this.eventService.emit('template.deleted', projectId, { templateId });
    return { deleted: true };
  }

  /**
   * Generate a project from a template.
   * - Parses the template content (JSON array of {path, content} entries)
   * - Substitutes {{var}} placeholders in both file paths and contents
   * - Creates a new Project
   * - Uploads the rendered files as a gzipped tarball to Storage
   * - Returns the project + generation metadata (not yet deployed)
   */
  async generateProject(userId: string, projectId: string, dto: GenerateProjectDto) {
    const template = await this.prisma.template.findFirst({
      where: { id: dto.templateId, OR: [{ projectId }, { isPublic: true }] },
    });
    if (!template) throw new NotFoundException('Template not found');

    // Parse template file list from JSON content
    let files: TarEntry[];
    try {
      files = JSON.parse(template.content);
    } catch {
      throw new BadRequestException('Template content must be a JSON array of {path, content} entries');
    }
    if (!Array.isArray(files)) {
      throw new BadRequestException('Template content must be a JSON array of {path, content} entries');
    }

    // Substitute variables in all file paths and contents
    const rendered = files.map(f => ({
      path: this.substitute(f.path, dto.variables),
      content: this.substitute(f.content, dto.variables),
    }));

    // Create new project
    const slug = dto.name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
    const project = await this.projectsService.create(userId, {
      name: dto.name,
      type: ProjectType.BACKEND,
      description: `Generated from template "${template.name}"`,
    });

    await this.eventService.emit('template.project_generated', project.id, {
      templateId: dto.templateId,
    });

    return { project, files: rendered, templateName: template.name };
  }

  /**
   * Full generate + deploy pipeline.
   * Renders the template, uploads to storage, then creates a deployment
   * with source.type = 'archive'.
   */
  async generateAndDeploy(userId: string, projectId: string, dto: GenerateAndDeployDto) {
    const { project, files } = await this.generateProject(userId, projectId, {
      templateId: dto.templateId,
      name: dto.name,
      variables: dto.variables,
    });

    // Build gzipped tarball from rendered files
    const archiveBuffer = await this.buildTarball(files);

    // Upload to the project's default storage bucket
    const bucket = await this.prisma.bucket.findFirst({ where: { projectId: project.id } });
    if (!bucket) throw new NotFoundException('Project storage bucket not found — please provision storage first');

    const archiveKey = `templates/${dto.templateId}/${Date.now()}-${project.slug}.tar.gz`;
    await this.storageService.uploadFile(
      userId, project.id, bucket.id, archiveKey,
      `${project.slug}.tar.gz`, 'application/gzip', archiveBuffer,
    );

    // Create deployment with archive source
    const deployment = await this.deploymentCrud.create(userId, project.id, {
      source: {
        type: SourceType.ARCHIVE,
        archive: {
          bucketId: bucket.id,
          objectKey: archiveKey,
        },
      },
      branch: 'generated',
    });

    await this.eventService.emit('templates.template.applied', project.id, {
      templateId: dto.templateId,
      deploymentId: deployment.id,
    });

    return { project, deployment, archiveKey };
  }

  async listCategories() {
    const templates = await this.prisma.template.findMany({
      where: { isPublic: true },
      select: { category: true },
      distinct: ['category'],
    });
    return { categories: templates.map(t => t.category) };
  }

  // --- Private helpers ---

  private substitute(text: string, vars: Record<string, string>): string {
    for (const [key, value] of Object.entries(vars)) {
      text = text.replace(new RegExp(`{{${key}}}`, 'g'), value ?? '');
    }
    return text;
  }

  private async buildTarball(files: TarEntry[]): Promise<Buffer> {
    const pack = tar.pack();
    const chunks: Buffer[] = [];

    for (const file of files) {
      const content = Buffer.from(file.content, 'utf8');
      pack.entry({ name: file.path }, content);
    }
    pack.finalize();

    for await (const chunk of pack) {
      chunks.push(chunk as Buffer);
    }

    const tarBuffer = Buffer.concat(chunks);
    return gzip(tarBuffer);
  }
}