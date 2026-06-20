import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { promises as fs } from 'fs';
import { join } from 'path';
import { ICertificateProvider } from './certificate.provider';

@Injectable()
export class TraefikCertProvider implements ICertificateProvider {
  private readonly logger = new Logger(TraefikCertProvider.name);
  readonly name = 'traefik';

  private readonly acmeDir = process.env.TRAEFIK_ACME_DIR ?? '/acme-dns';
  private readonly acmeFile = 'acme.json';

  async triggerIssuance(domain: string): Promise<void> {
    // Traefik's ACME provider auto-discovers challenges when dynamic.yml is written
    // with the certResolver. The TLS cert resolver in dynamic.yml already configures
    // dnsChallenge for cloudflare. Triggering = writing dynamic.yml (done by ProxyStep).
    // We just need to verify Traefik can see the challenge.
    this.logger.log(`Certificate issuance triggered for: ${domain}`);
  }

  async waitForCertificate(domain: string, timeoutMs = 90_000): Promise<boolean> {
    const deadline = Date.now() + timeoutMs;
    this.logger.log(`Waiting up to ${timeoutMs / 1000}s for certificate for: ${domain}`);

    while (Date.now() < deadline) {
      const active = await this.isCertificateActive(domain);
      if (active) {
        this.logger.log(`Certificate is active for: ${domain}`);
        return true;
      }
      await this.sleep(5000);
    }

    this.logger.warn(`Certificate wait timed out for: ${domain}`);
    return false;
  }

  async isCertificateActive(domain: string): Promise<boolean> {
    try {
      const acmePath = join(this.acmeDir, this.acmeFile);
      const content = await fs.readFile(acmePath, 'utf8');
      const acme = JSON.parse(content);

      // ACME JSON structure: { "myresolver": { "Account": {...}, "Certificates": [...] } }
      const certs: Array<{ domain: { main: string }; expires: string }> =
        acme['myresolver']?.Certificates ?? [];

      const now = new Date();
      const found = certs.find(c => c.domain.main === domain || c.domain.main === `*.${domain}`);
      if (!found) return false;

      const expires = new Date(found.expires);
      return expires > now;
    } catch {
      // File not yet created — cert not issued
      return false;
    }
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
