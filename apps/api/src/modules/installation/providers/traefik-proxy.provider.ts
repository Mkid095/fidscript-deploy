import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { promises as fs } from 'fs';
import { join } from 'path';
import { IReverseProxyProvider } from './reverse-proxy.provider';

@Injectable()
export class TraefikProxyProvider implements IReverseProxyProvider {
  private readonly logger = new Logger(TraefikProxyProvider.name);
  readonly name = 'traefik';

  // dynamic.yml path inside the traefik container (mounted from host)
  private readonly traefikDynamicYml = '/etc/traefik/dynamic.yml';

  async configurePlatformRouting(domain: string): Promise<void> {
    const traefikDir = process.env.TRAEFIK_DYNAMIC_DIR ?? '/etc/traefik';
    const dynamicYmlPath = join(traefikDir, 'dynamic.yml');

    const config = this.buildDynamicYml(domain);
    try {
      await fs.writeFile(dynamicYmlPath, config, 'utf8');
      this.logger.log(`Traefik dynamic.yml written for domain: ${domain}`);
    } catch (err) {
      this.logger.error(`Failed to write Traefik dynamic.yml: ${err instanceof Error ? err.message : err}`);
      throw err;
    }
  }

  async removePlatformRouting(_domain: string): Promise<void> {
    // TODO: parse existing dynamic.yml and remove platform-specific entries
    this.logger.warn('removePlatformRouting not yet implemented');
  }

  async reload(): Promise<void> {
    try {
      // Traefik watches dynamic.yml via `watch: true` — no explicit reload needed.
      // But we can signal via the API if configured.
      this.logger.log('Traefik configuration updated (watch trigger)');
    } catch (err) {
      this.logger.error(`Failed to reload Traefik: ${err instanceof Error ? err.message : err}`);
    }
  }

  async isWritable(): Promise<boolean> {
    const traefikDir = process.env.TRAEFIK_DYNAMIC_DIR ?? '/etc/traefik';
    const dynamicYmlPath = join(traefikDir, 'dynamic.yml');
    try {
      const { W_OK } = await import('fs').then(m => m.constants);
      await fs.access(dynamicYmlPath, W_OK);
      return true;
    } catch {
      return false;
    }
  }

  private buildDynamicYml(domain: string): string {
    return `# Managed by FIDScript Platform — do not edit manually
http:
  routers:
    fidscript-api:
      rule: \`Host(\`api.${domain}\`)\`
      service: fidscript-api
      entryPoints:
        - websecure
      tls:
        certResolver: myresolver

    fidscript-dashboard:
      rule: \`Host(\`${domain}\`)\`
      service: fidscript-dashboard
      entryPoints:
        - websecure
      tls:
        certResolver: myresolver

  services:
    fidscript-api:
      loadBalancer:
        servers:
          - url: http://fidscript-api:3001

    fidscript-dashboard:
      loadBalancer:
        servers:
          - url: http://fidscript-dashboard:3000

certificatesResolvers:
  myresolver:
    acme:
      email: admin@${domain}
      storage: /acme-dns/acme.json
      dnsChallenge:
        provider: cloudflare
        resolvers:
          - 1.1.1.1
          - 1.0.0.1
`;
  }
}
