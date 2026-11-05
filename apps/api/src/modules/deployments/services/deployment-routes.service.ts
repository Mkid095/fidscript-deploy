import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { promises as fs } from 'fs';
import { join } from 'path';
import { PrismaService } from '@/prisma/prisma.service';

/**
 * Writes the Traefik routers that publish a deployment's CUSTOM domains.
 *
 * The default deployment hostname (`{slug}.apps.{platformDomain}`) is
 * published by Traefik's Docker provider, from the labels the run args
 * put on the container. A custom domain has no such label — and a label
 * could not help anyway, because a domain can be attached to a
 * deployment AFTER the container is running.
 *
 * So the custom domains are published through Traefik's FILE provider
 * instead, into their own file (`dynamic-deployments.yml`) alongside the
 * platform's `dynamic.yml`. Two files, one directory: Traefik's file
 * provider reads every YAML file in the directory it is pointed at, so
 * the platform's routing and the deployments' routing never overwrite
 * each other.
 *
 * The service URL points at the container's NAME on the platform's app
 * network (`fidscript-{slug}-{deploymentId}`), not at its IP — the name
 * is stable and Docker's DNS resolves it, so a container restart does not
 * invalidate the route.
 */
@Injectable()
export class DeploymentRoutesService {
  private readonly logger = new Logger(DeploymentRoutesService.name);

  constructor(
    private prisma: PrismaService,
    private configService: ConfigService,
  ) {}

  /**
   * Rewrite the deployment routers from the current state of the database.
   *
   * Called after a deployment succeeds, after a domain is attached or
   * detached, and after a deployment is removed. It is idempotent: the
   * file is rebuilt from the database every time, so a stale route cannot
   * survive a failed write.
   */
  async sync(): Promise<void> {
    const traefikDir = process.env.TRAEFIK_DYNAMIC_DIR ?? '/etc/traefik';
    const file = join(traefikDir, 'dynamic-deployments.yml');

    let routers: Record<string, unknown> = {};
    let services: Record<string, unknown> = {};

    try {
      const deployments = await this.prisma.deployment.findMany({
        where: { status: 'SUCCESS', deploymentUrl: { not: null } },
        include: {
          project: true,
          release: true,
          domains: { where: { deploymentId: { not: null } } },
        },
      });

      for (const deployment of deployments) {
        const port = this.resolvePort(deployment);
        if (!port) continue;

        // The default hostname is Traefik's Docker provider's job.
        const defaultHost = this.defaultHost(deployment.project.slug);
        const custom = (deployment.domains ?? []).filter(
          (d) => d.domain && d.domain !== defaultHost && d.sslStatus !== 'FAILED',
        );
        if (custom.length === 0) continue;

        const container = `fidscript-${deployment.project.slug}-${deployment.id}`;

        for (const domain of custom) {
          const key = this.routeKey(deployment.id, domain.domain);
          routers[key] = {
            rule: `Host(\`${domain.domain}\`)`,
            service: key,
            entryPoints: ['websecure'],
            tls: { certResolver: this.certResolver(domain) },
          };
          services[key] = {
            loadBalancer: {
              servers: [{ url: `http://${container}:${port}` }],
            },
          };
        }
      }
    } catch (err) {
      this.logger.warn(
        `[deployments] Could not read the deployment routes: ${err instanceof Error ? err.message : String(err)}`,
      );
      return;
    }

    const yaml = this.render(routers, services);
    try {
      await fs.writeFile(file, yaml, 'utf8');
      const count = Object.keys(routers).length;
      this.logger.log(`[deployments] Traefik deployment routes written (${count} custom domain${count === 1 ? '' : 's'})`);
    } catch (err) {
      // A failure here means the custom domains are not reachable, but the
      // deployment itself is fine — never fail a deployment over it.
      this.logger.warn(
        `[deployments] Could not write ${file}: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }

  /** The port the container listens on, from the build's detected port. */
  private resolvePort(deployment: any): number | null {
    const detected = deployment.release?.runtimePort;
    if (typeof detected === 'number' && detected > 0) return detected;
    // Fall back to the platform's default for the project type.
    const port = this.configService.get<number>('DEPLOYMENT_DEFAULT_PORT', 3000);
    return port > 0 ? port : null;
  }

  private defaultHost(slug: string): string {
    const platformDomain = this.configService.get<string>('PLATFORM_DOMAIN', 'apps.local');
    return `${slug}.apps.${platformDomain}`;
  }

  /**
   * DNS-01 needs a Cloudflare API token for the zone, which the platform
   * only holds for zones it manages. HTTP-01 works for any domain whose
   * A record points at the platform, so it is the safe default for a
   * domain the customer set up themselves.
   */
  private certResolver(domain: any): string {
    return domain.dnsMode === 'cloudflare_auto' ? 'letsencrypt-dns' : 'letsencrypt-http';
  }

  /** A Traefik-safe identifier for the router and its service. */
  private routeKey(deploymentId: string, domain: string): string {
    const slug = domain.replace(/[^a-zA-Z0-9]+/g, '-').toLowerCase();
    return `deploy-${deploymentId.slice(0, 8)}-${slug}`;
  }

  private render(routers: Record<string, unknown>, services: Record<string, unknown>): string {
    const lines: string[] = [
      '# Managed by the FIDScript platform — do not edit manually.',
      '#',
      '# The routers that publish a deployment\'s CUSTOM domains. The default',
      '# {slug}.apps.{platformDomain} hostname is published by Traefik\'s Docker',
      '# provider from the container labels; this file covers the rest.',
      'http:',
      '  routers:',
    ];
    if (Object.keys(routers).length === 0) {
      lines.push('    {}');
    } else {
      for (const [name, body] of Object.entries(routers)) {
        lines.push(`    ${name}:`);
        for (const [k, v] of Object.entries(body as Record<string, unknown>)) {
          lines.push(`      ${k}: ${this.scalar(v)}`);
        }
      }
    }
    lines.push('  services:');
    if (Object.keys(services).length === 0) {
      lines.push('    {}');
    } else {
      for (const [name, body] of Object.entries(services)) {
        lines.push(`    ${name}:`);
        lines.push('      loadBalancer:');
        lines.push('        servers:');
        for (const server of (body as any).loadBalancer.servers) {
          lines.push(`          - url: "${server.url}"`);
        }
      }
    }
    return lines.join('\n') + '\n';
  }

  /** Renders a scalar as YAML. Strings are quoted; everything else is not. */
  private scalar(value: unknown): string {
    if (typeof value === 'string') return JSON.stringify(value);
    if (Array.isArray(value)) return `[${value.map(v => this.scalar(v)).join(', ')}]`;
    if (value && typeof value === 'object') {
      return `{${Object.entries(value as Record<string, unknown>)
        .map(([k, v]) => `${k}: ${this.scalar(v)}`)
        .join(', ')}}`;
    }
    return String(value);
  }
}
