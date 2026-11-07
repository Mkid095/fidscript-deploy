import { Injectable, ConflictException } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { EventService } from '@/modules/events/event.service';
import { CreateProjectDto } from '@/modules/projects/dto/index';
import { ProjectFormatService } from './project-format.service';
import { ProjectProvisionService } from './project-provision.service';
import { ProjectWorkspaceService } from './project-workspace.service';
import * as crypto from 'crypto';

@Injectable()
export class ProjectCreateService {
  constructor(
    private prisma: PrismaService,
    private eventService: EventService,
    private format: ProjectFormatService,
    private provisioner: ProjectProvisionService,
    private workspace: ProjectWorkspaceService,
  ) {}

  async create(userId: string, dto: CreateProjectDto) {
    const slug = this.generateSlug(dto.name);
    const existing = await this.prisma.project.findUnique({ where: { slug } });
    if (existing) throw new ConflictException('Project with this name already exists');

    // A project may live in a team. The person creating it has to be one of
    // that team's members — otherwise anyone could put a project in someone
    // else's workspace.
    if (dto.organizationId) {
      await this.workspace.assertMember(userId, dto.organizationId);
    }

    // The shape is what the project's menu is derived from, and the
    // deployment switch follows it unless the caller says otherwise.
    const shape = dto.shape ?? 'DEPLOYMENT';
    const deploymentOn = dto.deploymentOn ?? (shape !== 'BACKEND');

    const project = await this.prisma.project.create({
      data: {
        name: dto.name, slug, description: dto.description,
        type: dto.type.toUpperCase() as any, ownerId: userId,
        organizationId: dto.organizationId ?? null,
        region: dto.region, subdomain: slug,
        shape: shape as any, deploymentOn,
      },
      include: { settings: true, organization: { select: { id: true, name: true, slug: true } } },
    });

    await this.prisma.projectSettings.create({ data: { projectId: project.id } });

    await this.eventService.emit('projects.project.created', project.id, {
      name: project.name,
      slug: project.slug,
    });

    // Fire-and-forget provisioning of default resources (DB, bucket, channel,
    // API key). Errors are logged but never block the create response.
    //
    // The project's status follows the provisioning: a project that is still
    // "creating" after its resources are up is a project that says
    // something untrue about itself.
    void this.provisioner
      .provisionDefaults(project.id, userId, project.name)
      .then(async (resources) => {
        await this.prisma.project
          .update({ where: { id: project.id }, data: { status: 'ACTIVE' } })
          .catch(() => undefined);

        this.eventService.emit('projects.project.provisioned', project.id, {
          projectId: project.id,
          databaseId: resources.databaseId,
          bucketId: resources.bucketId,
          channelId: resources.channelId,
          apiKeyId: resources.apiKeyId,
          errors: resources.errors,
        });
      })
      .catch((err) => {
        // The provisioning itself failed — the project stays "creating", and
        // the reason is in the event.
        this.eventService.emit('projects.project.provision_failed', project.id, {
          projectId: project.id,
          error: err instanceof Error ? err.message : String(err),
        });
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
        shape: source.shape, deploymentOn: source.deploymentOn,
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
    return `${base}-${crypto.randomBytes(4).toString('hex')}`;
  }
}
