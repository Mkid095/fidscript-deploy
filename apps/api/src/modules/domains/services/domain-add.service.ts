import { Injectable, NotFoundException, ForbiddenException, ConflictException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '@/prisma/prisma.service';
import { EventService } from '@/modules/events/event.service';
import { DomainMxService } from '@/modules/domains/services/domain-mx.service';
import { DomainCloudflareAutoService } from '@/modules/domains/services/domain-cloudflare-auto.service';
import { DomainListService } from './domain-list.service';
import { DomainAccessService } from './domain-access.service';
import { reservedHostReason } from './reserved-hosts';
import { AddDomainDto } from '@/modules/domains/dto/add-domain.dto';

@Injectable()
export class DomainAddService {
  private readonly platformDomain: string;

  constructor(
    private prisma: PrismaService,
    private eventService: EventService,
    private domainMxService: DomainMxService,
    private cloudflareAuto: DomainCloudflareAutoService,
    private listService: DomainListService,
    private access: DomainAccessService,
    private configService: ConfigService,
  ) {
    this.platformDomain = this.configService.get<string>('PLATFORM_DOMAIN', 'apps.local');
  }

  async add(userId: string, projectId: string, dto: AddDomainDto) {
    await this.access.ensureAccess(userId, projectId);
    this.assertNotReserved(dto.domain);

    let deployment: any = null;
    if (dto.deploymentId) {
      deployment = await this.prisma.deployment.findUnique({ where: { id: dto.deploymentId } });
      if (!deployment || deployment.projectId !== projectId) throw new NotFoundException('Deployment not found in this project');
      if (deployment.status !== 'SUCCESS') throw new ConflictException('Can only add a domain to a successful deployment');
    }
    const existing = await this.prisma.domain.findFirst({ where: { projectId, domain: dto.domain } });
    if (existing) throw new ConflictException('Domain already added to this project');

    // One project, one name.
    //
    // The platform is multi-tenant by project: a project's application, its
    // mail, and its numbers all live under that project's single name. A
    // project that already answers on a name cannot start answering on a
    // second — the second is blocked until the first is released. (Re-adding
    // the *same* name is the "existing" check above.)
    const activeCount = await this.prisma.domain.count({ where: { projectId } });
    if (activeCount > 0) {
      const current = await this.prisma.domain.findFirst({
        where: { projectId },
        select: { domain: true },
      });
      throw new ConflictException(
        `This project already answers on "${current?.domain}". ` +
        `A project has a single name — release that domain before registering another.`,
      );
    }

    const isPlatform = dto.domain.endsWith(`.${this.platformDomain}`);
    const isApex = !dto.domain.startsWith('www.') && dto.domain.split('.').length === 2;
    const isPrimaryRequested = dto.type?.includes('DEPLOYMENT') ?? true;

    // Cross-project conflict: the same name is registered on another
    // project. The default answer is a conflict — never a silent takeover.
    // With `takeOver` the name is moved: released from the other project
    // and claimed here.
    const takenElsewhere = await this.prisma.domain.findFirst({
      where: { domain: dto.domain, projectId: { not: projectId } },
      select: {
        id: true,
        projectId: true,
        project: { select: { name: true, slug: true } },
      },
    });
    if (takenElsewhere && !dto.takeOver) {
      throw new ConflictException(
        `The name "${dto.domain}" is already assigned to the project ` +
        `"${takenElsewhere.project?.name ?? takenElsewhere.projectId}". ` +
        `Confirm to move it here.`,
      );
    }
    if (takenElsewhere && dto.takeOver) {
      // Release the name from the other project, then claim it here: the
      // old row's routing pointer drops, its linked mail is stood down, and
      // the row is released. The create below registers the name under this
      // project and re-points its records to this project's host.
      await this.prisma.domain.update({
        where: { id: takenElsewhere.id },
        data: { deploymentId: null, isPrimary: false },
      });
      await this.prisma.emailDomain
        .updateMany({
          where: { projectId: takenElsewhere.projectId, domain: dto.domain },
          data: { status: 'PENDING', verifiedAt: null },
        })
        .catch(() => undefined);
      await this.prisma.domain.delete({ where: { id: takenElsewhere.id } });
      await this.eventService.emit(
        'domain.taken_over',
        projectId,
        {
          domain: dto.domain,
          fromProjectId: takenElsewhere.projectId,
          toProjectId: projectId,
        },
        { actorId: userId, actorType: 'user', resourceType: 'domain', resourceId: takenElsewhere.id },
      );
      // fall through: register the name under this project (create below)
    }

    const mx = await this.domainMxService.checkMxRecords(dto.domain);
    const isPrimary = isApex && isPrimaryRequested && (await this.prisma.domain.count({ where: { projectId, isPrimary: true } })) === 0;

    // Derive capabilities from domain type array, defaulting to DEPLOYMENT
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const domainTypes: any[] = dto.type?.length ? dto.type : ['DEPLOYMENT'];
    const capabilities: Record<string, boolean> = {
      deployment: domainTypes.includes('DEPLOYMENT') || domainTypes.includes('API'),
      email: domainTypes.includes('EMAIL'),
      inboundEmail: domainTypes.includes('INBOUND_EMAIL'),
      tracking: domainTypes.includes('TRACKING'),
      api: domainTypes.includes('API'),
      redirect: domainTypes.includes('REDIRECT'),
      sandbox: domainTypes.includes('SANDBOX'),
    };

    const domain = await this.prisma.domain.create({
      data: {
        projectId, deploymentId: dto.deploymentId, domain: dto.domain,
        isCustom: !isPlatform, isPrimary, apexDomain: isApex,
        type: domainTypes,
        capabilities,
        dnsMode: dto.dnsMode ?? 'manual', redirectMode: dto.redirectMode ?? 'none',
        sslEnabled: dto.sslEnabled ?? true, sslStatus: 'PENDING', dnsStatus: 'PENDING',
        emailWarning: mx.hasMx, emailProvider: mx.provider || null,
      },
    });

    await this.eventService.emit(
      'domain.added',
      projectId,
      { domainId: domain.id, domain: dto.domain, type: domainTypes, capabilities, isCustom: !isPlatform, emailWarning: mx.hasMx, emailProvider: mx.provider },
      { actorId: userId, actorType: 'user', resourceType: 'domain', resourceId: domain.id },
    );

    const targetHost = await this.targetHost(projectId);
    const instructions = this.getDnsInstructions(dto.domain, targetHost, isApex);

    if (dto.dnsMode === 'cloudflare_auto') {
      // The domain is bound to the project's connection, so the check and
      // the auto-configuration both know whose account to write in.
      const connection = await this.prisma.domainConnection.findFirst({
        where: { projectId, provider: 'CLOUDFLARE' },
        orderBy: { createdAt: 'desc' },
      });
      if (connection) {
        await this.prisma.domain.update({
          where: { id: domain.id },
          data: { dnsConnectionId: connection.id },
        });
      }

      // The records are written whether or not a deployment exists yet —
      // the domain is prepared for the application that will answer on it.
      await this.cloudflareAuto.cloudflareAutoSetup(
        projectId,
        domain.id,
        dto.domain,
        isApex,
      );
    }

    return {
      domain: this.listService.formatDomain(domain),
      instructions,
      emailWarning: mx.hasMx ? { detected: true, provider: mx.provider, message: `Email service detected (${mx.provider}).` } : { detected: false },
    };
  }

  async getInstructions(userId: string, projectId: string, domainId: string) {
    await this.access.ensureAccess(userId, projectId);
    const domain = await this.prisma.domain.findFirst({
      where: { id: domainId, projectId },
      include: { deployment: { select: { deploymentUrl: true } } },
    });
    if (!domain) throw new NotFoundException('Domain not found');
    const targetHost = await this.targetHost(projectId);
    return { domain: this.listService.formatDomain(domain), instructions: this.getDnsInstructions(domain.domain, targetHost, domain.apexDomain) };
  }

  /**
   * A name the platform itself answers on cannot become a project's domain.
   *
   * The platform publishes its console at `app.<domain>` and its API at
   * `api.<domain>`, and it hosts its applications on names of the same
   * shape. A project that took one of them would take the platform's own
   * door off its hinges — so the name is refused, with the reason and the
   * way out.
   */
  private assertNotReserved(domain: string): void {
    const reason = reservedHostReason(domain, this.platformDomain);
    if (reason) throw new ConflictException(reason);
  }

  /**
   * The host the project's application is published on.
   *
   * Traefik publishes every project at `{slug}.apps.{domain}`, so this is
   * where a CNAME for the project's own domain has to point — the domain's
   * first label is not it (`app.example.com` says nothing about `fidscript`).
   */
  private async targetHost(projectId: string): Promise<string> {
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
      select: { slug: true },
    });
    return `${project?.slug ?? 'app'}.apps.${this.platformDomain}`;
  }

  getDnsInstructions(domain: string, targetHost: string, isApex: boolean) {
    const instructions = [];
    if (isApex) {
      // The server's own address — a literal "YOUR_SERVER_IP" is a record
      // that points nowhere.
      instructions.push({
        type: 'A',
        name: '@',
        value: this.configService.get<string>('SERVER_IP', ''),
        ttl: 300,
        notes: 'A record for the root domain.',
      });
    } else {
      instructions.push({ type: 'CNAME', name: domain.replace(`.${this.platformDomain}`, '').split('.')[0], value: targetHost, ttl: 300, notes: `Routes ${domain} to your deployment.` });
    }
    instructions.push({ type: 'TXT', name: `_fidscript-verification.${domain}`, value: 'FIDScript verified', ttl: 300, notes: 'Proves you own this domain.' });
    return instructions;
  }
}
