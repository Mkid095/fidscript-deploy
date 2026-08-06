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
    // Use TRAEFIK_DYNAMIC_DIR as the host path (must be set to the directory containing
    // dynamic.yml on the HOST, e.g. /home/ken/fidscript-deploy/installer/docker/traefik).
    // Falls back to /etc/traefik for dev/CI where that path is writable.
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
    // TRAEFIK_DYNAMIC_DIR must be the host path (e.g. /home/ken/fidscript-deploy/installer/docker/traefik)
    // NOT the in-container path (/etc/traefik). The host path is passed via the env var so the
    // API (running in its own network namespace) can reach the host filesystem via the
    // /var/run/docker.sock mount — or when TRAEFIK_DYNAMIC_DIR is unset, fall back to the
    // container path for dev/CI environments where that path is writable.
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
    // Traefik resolves certResolver names against the resolvers defined in
    // installer/traefik/traefik.yml. The committed traefik.yml defines two
    // resolvers: `letsencrypt-dns` (DNS-01 via Cloudflare) and
    // `letsencrypt-http` (HTTP-01 fallback). The previous template used a
    // hardcoded `myresolver` placeholder which doesn't exist in the static
    // config — Traefik silently ignores the tls block and certificates
    // never get issued. Use the real resolver names.
    //
    // NOTE: do NOT define `certificatesResolvers` here — the file provider
    // can only define them per the static config. The original template's
    // `certificatesResolvers: myresolver` block was both a typo and a no-op
    // (file providers can't redefine resolvers that already exist on the
    // static config).
    return `# Managed by FIDScript Platform — do not edit manually
http:
  routers:
    fidscript-api:
      rule: \`Host(\`api.${domain}\`)\`
      service: fidscript-api
      entryPoints:
        - websecure
      tls:
        certResolver: letsencrypt-dns

    fidscript-dashboard:
      rule: \`Host(\`${domain}\`)\`
      service: fidscript-dashboard
      entryPoints:
        - websecure
      tls:
        certResolver: letsencrypt-dns

  services:
    fidscript-api:
      loadBalancer:
        servers:
          - url: http://fidscript-api:3001

    fidscript-dashboard:
      loadBalancer:
        servers:
          - url: http://fidscript-dashboard:3000
`;
  }
}
