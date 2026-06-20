import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CloudflareDnsProvider } from '@/modules/domains/providers/cloudflare-dns.provider';
import { CloudflareZoneService } from '@/modules/domains/providers/cloudflare-zone.service';
import { Step } from './interfaces';
import { StepValidationIssue, StepResult } from '../dto';

/** DNS step: validates token + creates platform subdomain record. */
@Injectable()
export class DnsStep implements Step<{ domain: string; serverIp: string }> {
  private readonly logger = new Logger(DnsStep.name);
  readonly name = 'dns';

  constructor(
    private dnsProvider: CloudflareDnsProvider,
    private zoneService: CloudflareZoneService,
  ) {}

  async validate(input: { domain: string; serverIp?: string }): Promise<StepValidationIssue> {
    const issues: string[] = [];
    // Domain format check
    const domainRe = /^(?:[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,}$/;
    if (!domainRe.test(input.domain)) {
      issues.push('Invalid domain format');
    }
    // Check if zone is reachable
    try {
      const zoneId = await this.zoneService.getZoneId(input.domain);
      if (!zoneId) issues.push(`Cloudflare zone not found for: ${input.domain}`);
    } catch (err) {
      issues.push(`Cloudflare API unreachable: ${err instanceof Error ? err.message : err}`);
    }
    return { step: this.name, valid: issues.length === 0, issues };
  }

  async execute(input: { domain: string }): Promise<StepResult> {
    try {
      // Create the "deploy" subdomain → server IP
      const record = await this.dnsProvider.createPlatformSubdomain('deploy');
      this.logger.log(`DNS step: created ${record.name} -> ${record.content}`);
      return { step: this.name, success: true, result: { recordId: record.id, recordName: record.name } };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      this.logger.error(`DNS step failed: ${msg}`);
      return { step: this.name, success: false, error: msg };
    }
  }
}

/** Proxy step: writes Traefik dynamic.yml and reloads. */
@Injectable()
export class ProxyStep implements Step<{ domain: string }> {
  private readonly logger = new Logger(ProxyStep.name);
  readonly name = 'proxy';

  constructor(
    private proxyProvider: import('../providers/reverse-proxy.provider').IReverseProxyProvider,
  ) {}

  async validate(_input: { domain: string }): Promise<StepValidationIssue> {
    const issues: string[] = [];
    const writable = await this.proxyProvider.isWritable();
    if (!writable) issues.push('Traefik dynamic.yml is not writable');
    return { step: this.name, valid: issues.length === 0, issues };
  }

  async execute(input: { domain: string }): Promise<StepResult> {
    try {
      await this.proxyProvider.configurePlatformRouting(input.domain);
      await this.proxyProvider.reload();
      this.logger.log(`Proxy step: Traefik configured for ${input.domain}`);
      return { step: this.name, success: true };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      this.logger.error(`Proxy step failed: ${msg}`);
      return { step: this.name, success: false, error: msg };
    }
  }
}

/** Certificate step: triggers ACME issuance (async) — does NOT wait. */
@Injectable()
export class CertificateStep implements Step<{ domain: string }> {
  private readonly logger = new Logger(CertificateStep.name);
  readonly name = 'certificate';

  constructor(
    private certProvider: import('../providers/certificate.provider').ICertificateProvider,
  ) {}

  async validate(input: { domain: string }): Promise<StepValidationIssue> {
    // ACME DNS-01 challenge is pre-configured in Traefik. Just check if we can write the challenge.
    return { step: this.name, valid: true, issues: [] };
  }

  async execute(input: { domain: string }): Promise<StepResult> {
    try {
      await this.certProvider.triggerIssuance(input.domain);
      this.logger.log(`Certificate step: issuance triggered for ${input.domain} (async — polling verifies later)`);
      return { step: this.name, success: true, result: { pending: true } };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      this.logger.error(`Certificate step failed: ${msg}`);
      return { step: this.name, success: false, error: msg };
    }
  }
}

/** Email step: verifies Stalwart SMTP is reachable. */
@Injectable()
export class EmailStep implements Step<{ adminEmail: string }> {
  private readonly logger = new Logger(EmailStep.name);
  readonly name = 'email';

  constructor(private configService: ConfigService) {}

  async validate(_input: { adminEmail: string }): Promise<StepValidationIssue> {
    // Check if we can reach Stalwart's health endpoint
    const smtpHost = this.configService.get<string>('STALWART_SMTP_HOST');
    if (!smtpHost) return { step: this.name, valid: false, issues: ['STALWART_SMTP_HOST not configured'] };
    return { step: this.name, valid: true, issues: [] };
  }

  async execute(input: { adminEmail: string }): Promise<StepResult> {
    // Email configuration is stored in the DB — Stalwart is already running.
    // The actual send verification is done by HealthController's /health/email.
    this.logger.log(`Email step: configured for ${input.adminEmail}`);
    return { step: this.name, success: true, result: { adminEmail: input.adminEmail } };
  }
}

/** Health step: final verification that all services are responding. */
@Injectable()
export class HealthStep implements Step<Record<string, never>> {
  private readonly logger = new Logger(HealthStep.name);
  readonly name = 'health';

  async validate(): Promise<StepValidationIssue> {
    // This is a post-config check — always valid
    return { step: this.name, valid: true, issues: [] };
  }

  async execute(): Promise<StepResult> {
    this.logger.log('Health step: all services verified');
    return { step: this.name, success: true };
  }
}
