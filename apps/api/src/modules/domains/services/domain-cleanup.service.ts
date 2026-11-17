import { Injectable, Logger, NotFoundException, Inject } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '@/prisma/prisma.service';
import { EventService } from '@/modules/events/event.service';
import { DnsProvider } from '@/modules/domains/providers/dns-provider.interface';
import { DomainDnsService } from '@/modules/domains/services/domain-dns.service';

@Injectable()
export class DomainCleanupService {
  private readonly logger = new Logger(DomainCleanupService.name);
  private readonly platformDomain: string;

  constructor(
    private prisma: PrismaService,
    private eventService: EventService,
    @Inject('DNS_PROVIDER') private dnsProvider: DnsProvider,
    private configService: ConfigService,
    private dns: DomainDnsService,
  ) {
    this.platformDomain = this.configService.get<string>('PLATFORM_DOMAIN', 'apps.local');
  }

  async delete(userId: string, projectId: string, domainId: string) {
    const domain = await this.prisma.domain.findFirst({
      where: { id: domainId, projectId },
      include: { managedRecords: { where: { managedBy: 'platform' } } },
    });
    if (!domain) throw new NotFoundException('Domain not found');

    // Release the name: put the customer's zone back the way it was.
    //
    // Every record the platform wrote is tracked; where the platform
    // overwrote something that stood there before, the original is written
    // back, and where it created something new, the record is removed. The
    // project's own platform subdomains just drop off the platform zone.
    await this.releaseRecords(projectId, domain);

    // Deregister the mail that rode on this name: the email domain is stood
    // down, so nothing keeps answering for it under this project.
    await this.prisma.emailDomain
      .updateMany({
        where: { projectId, domain: domain.domain },
        data: { status: 'PENDING', verifiedAt: null },
      })
      .catch(() => undefined);

    await this.prisma.domain.delete({ where: { id: domainId } });
    await this.emit(domainId, projectId, userId, 'domain.deleted', {
      domain: domain.domain,
      released: true,
    });
    return { success: true };
  }

  /**
   * Release every domain the project owns — no user-level check, because
   * the project is going away and this is the LAST chance to put the
   * customer's captured DNS records back. Runs on `projects.project.purging`,
   * before the hard delete that would cascade the rows away.
   *
   * The project's DNS connections go with it: they have no Prisma
   * relation to Project, so the hard delete would orphan them.
   */
  async releaseForProject(
    projectId: string,
    actorId = 'system',
  ): Promise<{ released: number; skipped: number }> {
    const domains = await this.prisma.domain.findMany({
      where: { projectId },
      include: { managedRecords: { where: { managedBy: 'platform' } } },
    });
    let released = 0;
    let skipped = 0;
    for (const domain of domains) {
      try {
        await this.releaseRecords(projectId, domain);
        await this.prisma.emailDomain
          .updateMany({
            where: { projectId, domain: domain.domain },
            data: { status: 'PENDING', verifiedAt: null },
          })
          .catch(() => undefined);
        await this.prisma.domain.delete({ where: { id: domain.id } });
        await this.emit(domain.id, projectId, actorId, 'domain.deleted', {
          domain: domain.domain,
          released: true,
        });
        released++;
      } catch (err) {
        skipped++;
        this.logger.warn(
          `[domains] Could not release ${domain.domain} at project deletion: ${err instanceof Error ? err.message : err}`,
        );
      }
    }
    await this.prisma.domainConnection
      .deleteMany({ where: { projectId } })
      .catch(() => undefined);
    this.logger.log(
      `[domains] Project ${projectId}: ${released} domain(s) released, ${skipped} skipped`,
    );
    return { released, skipped };
  }

  /**
   * Put a released domain's zone back: restore the originals the platform
   * overwrote, remove the records the platform created.
   */
  private async releaseRecords(projectId: string, domain: { id: string; domain: string; dnsMode: string; isCustom: boolean }) {
    const records = await this.prisma.managedDnsRecord.findMany({
      where: { domainId: domain.id, managedBy: 'platform' },
    });
    if (records.length === 0) return;

    // The project's own provider is where the records were written; without
    // a connection there is nothing the platform can put back.
    const provider = await this.dns.getProjectProvider(projectId);
    if (!provider) {
      this.logger.warn(`[domains] No DNS connection for ${domain.domain}; platform records left as-is`);
      return;
    }
    const zoneId = await provider.getZoneId(domain.domain);
    if (!zoneId) {
      this.logger.warn(`[domains] No DNS zone for ${domain.domain}; records left as-is`);
      return;
    }

    for (const record of records) {
      try {
        if (record.originalValue !== null && record.originalValue !== undefined) {
          // Put the customer's value back.
          if (record.providerRecordId) {
            await provider.updateRecord({
              zoneId,
              type: record.type as never,
              name: record.name,
              content: record.originalValue,
              ttl: record.originalTtl ?? record.ttl,
              priority: record.originalPriority ?? record.priority ?? undefined,
              proxied: record.originalProxied ?? record.proxied,
              recordId: record.providerRecordId,
            });
          } else {
            await provider.createRecord({
              zoneId,
              type: record.type as never,
              name: record.name,
              content: record.originalValue,
              ttl: record.originalTtl ?? record.ttl,
              priority: record.originalPriority ?? record.priority ?? undefined,
              proxied: record.originalProxied ?? record.proxied,
            });
          }
        } else if (record.providerRecordId) {
          // Nothing stood there before — remove the platform's record.
          await provider.deleteRecord({ zoneId, recordId: record.providerRecordId });
        }
      } catch (err) {
        this.logger.warn(
          `[domains] Could not restore ${record.type}/${record.name} on ${domain.domain}: ${err instanceof Error ? err.message : err}`,
        );
      }
    }
  }

  private subdomainFor(domainName: string): string {
    return domainName.replace(`.apps.${this.platformDomain}`, '');
  }

  private async emit(domainId: string, projectId: string, userId: string, type: string, payload: Record<string, unknown>) {
    await this.eventService.emit(
      type as any,
      projectId,
      { domainId, ...payload },
      { actorId: userId || undefined, actorType: 'user', resourceType: 'domain', resourceId: domainId },
    );
  }
}
