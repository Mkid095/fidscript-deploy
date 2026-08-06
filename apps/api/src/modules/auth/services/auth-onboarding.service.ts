import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { EventService } from '@/modules/events/event.service';

const ORG_OWNER_PERMISSIONS = JSON.stringify(['*']);

export interface OnboardingResult {
  organizationId: string;
  projectId: string;
}

/**
 * Auto-provisions a default Organization + Project for a newly registered user
 * so the dashboard is never empty on first login.
 *
 * Idempotent: if the user already owns an Organization or Project, returns
 * the existing one without re-creating. Safe to call multiple times.
 *
 * Errors are logged but never thrown — the user row has already been created
 * and we don't want to strand a registered account. A background job can
 * reconcile orphaned users later.
 */
@Injectable()
export class AuthOnboardingService {
  private readonly logger = new Logger(AuthOnboardingService.name);

  constructor(
    private prisma: PrismaService,
    private eventService: EventService,
  ) {}

  async provisionDefaults(userId: string, email: string): Promise<OnboardingResult | null> {
    try {
      const existingOrg = await this.prisma.organizationMember.findFirst({
        where: { userId },
        include: { organization: true },
      });
      const existingProject = await this.prisma.project.findFirst({
        where: { ownerId: userId },
      });

      let organizationId: string;
      if (existingOrg) {
        organizationId = existingOrg.organizationId;
      } else {
        const org = await this.createPersonalOrganization(userId, email);
        organizationId = org.id;
      }

      let projectId: string;
      if (existingProject) {
        projectId = existingProject.id;
      } else {
        const project = await this.createDefaultProject(userId, organizationId);
        projectId = project.id;
      }

      return { organizationId, projectId };
    } catch (err) {
      this.logger.error(
        `Failed to auto-provision defaults for user ${userId} (${email}): ${(err as Error).message}`,
        (err as Error).stack,
      );
      return null;
    }
  }

  private async createPersonalOrganization(userId: string, email: string) {
    const baseSlug = email.split('@')[0].toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').substring(0, 50) || 'user';
    const slug = await this.uniqueOrgSlug(baseSlug);
    const orgName = `${email.split('@')[0]}'s Organization`;

    const org = await this.prisma.organization.create({
      data: {
        name: orgName,
        slug,
        plan: 'starter',
        roles: {
          create: { name: 'OWNER', permissions: ORG_OWNER_PERMISSIONS },
        },
      },
      include: { roles: true },
    });

    const ownerRole = org.roles.find((r) => r.name === 'OWNER')!;
    await this.prisma.organizationMember.create({
      data: { organizationId: org.id, userId, roleId: ownerRole.id },
    });

    await this.eventService.emit('identity.organization.created', null, { name: org.name, slug: org.slug, source: 'signup' }, {
      actorId: userId,
      actorType: 'user',
      resourceType: 'organization',
      resourceId: org.id,
    });

    return org;
  }

  private async createDefaultProject(userId: string, organizationId: string) {
    const baseSlug = 'my-first-project';
    const slug = await this.uniqueProjectSlug(baseSlug);

    // type is omitted → schema default FRONTEND. status set ACTIVE so
    // dashboard never shows a stuck "CREATING" tile for the starter project.
    const project = await this.prisma.project.create({
      data: {
        name: 'My First Project',
        slug,
        status: 'ACTIVE',
        ownerId: userId,
        subdomain: slug,
      },
    });

    await this.prisma.projectSettings.create({ data: { projectId: project.id } });
    await this.prisma.projectMember.create({
      data: { projectId: project.id, userId, role: 'owner' },
    });

    await this.eventService.emit('projects.project.created', project.id, {
      name: project.name,
      slug: project.slug,
      source: 'signup',
    });

    return project;
  }

  private async uniqueOrgSlug(base: string): Promise<string> {
    for (let attempt = 0; attempt < 5; attempt++) {
      const candidate = attempt === 0 ? base : `${base}-${Math.random().toString(36).substring(2, 8)}`;
      const taken = await this.prisma.organization.findUnique({ where: { slug: candidate } });
      if (!taken) return candidate;
    }
    return `${base}-${Date.now().toString(36)}`;
  }

  private async uniqueProjectSlug(base: string): Promise<string> {
    for (let attempt = 0; attempt < 5; attempt++) {
      const candidate = attempt === 0 ? base : `${base}-${Math.random().toString(36).substring(2, 8)}`;
      const taken = await this.prisma.project.findUnique({ where: { slug: candidate } });
      if (!taken) return candidate;
    }
    return `${base}-${Date.now().toString(36)}`;
  }
}
