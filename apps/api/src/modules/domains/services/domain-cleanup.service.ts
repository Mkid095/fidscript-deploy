import { Injectable, Logger, NotFoundException, Inject } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '@/prisma/prisma.service';
import { EventService } from '@/modules/events/event.service';
import { DnsProvider } from '@/modules/domains/providers/dns-provider.interface';

@Injectable()
export class DomainCleanupService {
  private readonly logger = new Logger(DomainCleanupService.name);
  private readonly platformDomain: string;

  constructor(
    private prisma: PrismaService,
    private eventService: EventService,
    @Inject('DNS_PROVIDER') private dnsProvider: DnsProvider,
    private configService: ConfigService,
  ) {
    this.platformDomain = this.configService.get<string>('PLATFORM_DOMAIN', 'apps.local');
  }

  async delete(userId: string, projectId: string, domainId: string) {
    const domain = await this.prisma.domain.findFirst({ where: { id: domainId, projectId } });
    if (!domain) throw new NotFoundException('Domain not found');

    if (domain.dnsMode === 'cloudflare_auto' && !domain.isCustom) {
      try {
        await this.dnsProvider.deletePlatformSubdomain(this.subdomainFor(domain.domain));
      } catch (err) {
        this.logger.warn(`[domains] Failed to clean DNS for ${domain.domain}: ${err instanceof Error ? err.message : err}`);
      }
    }

    await this.prisma.domain.delete({ where: { id: domainId } });
    await this.emit(domainId, projectId, userId, 'domain.deleted', { domain: domain.domain });
    return { success: true };
  }

  private subdomainFor(domain: string): string {
    return domain.replace(`.apps.${this.platformDomain}`, '');
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
