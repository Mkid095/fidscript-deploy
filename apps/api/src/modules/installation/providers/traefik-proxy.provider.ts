import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { promises as fs } from 'fs';
import { join } from 'path';
import { IReverseProxyProvider } from './reverse-proxy.provider';
import { buildPlatformRoutes } from './platform-routes';

@Injectable()
export class TraefikProxyProvider implements IReverseProxyProvider {
  private readonly logger = new Logger(TraefikProxyProvider.name);
  readonly name = 'traefik';

  // The platform's routing lives in platform.yml, inside the directory
  // Traefik's file provider watches. The deployments' routers live in
  // dynamic-deployments.yml, in the same directory — two files, so
  // rewriting one never destroys the other.
  private readonly traefikDynamicYml = '/etc/traefik/dynamic/platform.yml';

  async configurePlatformRouting(domain: string): Promise<void> {
    // Use TRAEFIK_DYNAMIC_DIR as the host path (must be set to the directory
    // containing dynamic.yml on the HOST, e.g.
    // /home/ken/fidscript-deploy/installer/docker/traefik). Falls back to
    // /etc/traefik for dev/CI where that path is writable.
    const traefikDir = process.env.TRAEFIK_DYNAMIC_DIR ?? '/etc/traefik/dynamic';
    const dynamicYmlPath = join(traefikDir, 'platform.yml');

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
      // Traefik watches dynamic.yml via `watch: true` — no explicit reload
      // needed. But we can signal via the API if configured.
      this.logger.log('Traefik configuration updated (watch trigger)');
    } catch (err) {
      this.logger.error(`Failed to reload Traefik: ${err instanceof Error ? err.message : err}`);
    }
  }

  async isWritable(): Promise<boolean> {
    // TRAEFIK_DYNAMIC_DIR must be the host path (e.g.
    // /home/ken/fidscript-deploy/installer/docker/traefik) NOT the in-container
    // path (/etc/traefik). The host path is passed via the env var so the API
    // (running in its own network namespace) can reach the host filesystem via
    // the /var/run/docker.sock mount — or when TRAEFIK_DYNAMIC_DIR is unset,
    // fall back to the container path for dev/CI environments where that path
    // is writable.
    const traefikDir = process.env.TRAEFIK_DYNAMIC_DIR ?? '/etc/traefik/dynamic';
    const dynamicYmlPath = join(traefikDir, 'platform.yml');
    try {
      const { W_OK } = await import('fs').then(m => m.constants);
      await fs.access(dynamicYmlPath, W_OK);
      return true;
    } catch {
      return false;
    }
  }

  private buildDynamicYml(domain: string): string {
    // The resolver: DNS-01 when the platform holds a Cloudflare token,
    // HTTP-01 otherwise. The installer picks the same way.
    const resolver = process.env.CLOUDFLARE_API_TOKEN_FILE ? 'letsencrypt-dns' : 'letsencrypt-http';
    return buildPlatformRoutes(domain, resolver);
  }

}
