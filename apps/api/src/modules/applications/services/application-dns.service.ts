import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CloudflareDnsProvider } from '@/modules/domains/providers/cloudflare-platform.service';
import { readAddonServices } from '../application-services.reader';

/**
 * Publishes the DNS records for an application that was just installed.
 *
 * The wizard creates these records for the add-ons it installs. One
 * installed later — from the Applications screen — needs them too, or its
 * console is a hostname that does not resolve.
 *
 * The hostnames come from the installer's own service list, so there is one
 * place they are written down.
 */
@Injectable()
export class ApplicationDnsService {
  private readonly logger = new Logger(ApplicationDnsService.name);

  constructor(
    private dns: CloudflareDnsProvider,
    private configService: ConfigService,
  ) {}

  /**
   * Publish an application's records, and say what happened.
   *
   * A failure here is not a failed install — the containers are up — so it
   * is reported and the install still succeeded.
   */
  async publish(addonId: string): Promise<string[]> {
    const services = readAddonServices(addonId);
    if (services.length === 0) return [];

    const zone = this.configService.get<string>('PLATFORM_DOMAIN', '');
    const notes: string[] = [];

    for (const service of services) {
      const name = `${service.host}.${zone}`;
      try {
        await this.dns.createPlatformSubdomain(service.host);
        notes.push(`DNS: ${name} → this server`);
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        notes.push(`DNS: could not publish ${name} — ${message}`);
        this.logger.warn(`[applications] Could not publish ${name}: ${message}`);
      }
    }
    return notes;
  }
}
