import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DeploymentProfile, RuntimeEnv } from '../types/deployment-profile';

@Injectable()
export class DockerBuildArgsService {
  private readonly APP_NETWORK = 'fidscript-app';

  constructor(private config: ConfigService) {}

  buildRunArgs(opts: {
    imageTag: string;
    containerName: string;
    projectSlug: string;
    envVars: RuntimeEnv[];
    profile: DeploymentProfile;
    domain: string;
    /**
     * The port the application actually listens on. Falls back to the
     * profile's default when the build provider could not tell us.
     */
    port?: number;
  }): string[] {
    const { imageTag, containerName, envVars, profile, domain } = opts;
    const port = opts.port ?? profile.defaultPort;
    // First element is the `docker` subcommand; the caller spawns `docker`
    // directly with execFileSync (no shell) so Traefik labels and env values
    // pass through verbatim. Do NOT join into a string + sh.
    const args = [
      'run', '--name', containerName, '--restart', 'unless-stopped',
      '--security-opt', 'no-new-privileges', '--read-only',
      '--tmpfs', '/tmp:rw,noexec,nosuid,size=64m',
      '--tmpfs', '/storage:rw,noexec,nosuid,size=128m',
      '--memory', '512m', '--cpus', '1', '--network', this.APP_NETWORK,
    ];
    for (const { key, value } of envVars) args.push('-e', `${key}=${value}`);
    if (!profile.requiresPort) { args.push('--detach', imageTag); return args; }
    args.push('-e', `PORT=${port}`);
    if (profile.requiresRoute) {
      // The router needs a certificate resolver. Without one, Traefik serves
      // its own default certificate: the application was up and healthy, and
      // every browser refused the hostname.
      const resolver = this.config.get<string>('TRAEFIK_CERT_RESOLVER', 'letsencrypt-dns');
      args.push(
        '-l', 'traefik.enable=true',
        '-l', `traefik.http.routers.${containerName}.rule=Host(\`${domain}\`)`,
        '-l', `traefik.http.routers.${containerName}.entrypoints=websecure`,
        '-l', `traefik.http.routers.${containerName}.tls=true`,
        '-l', `traefik.http.routers.${containerName}.tls.certresolver=${resolver}`,
        '-l', `traefik.http.services.${containerName}.loadbalancer.server.port=${port}`,
        '-l', `traefik.docker.network=${this.APP_NETWORK}`,
      );
    }
    args.push('--detach', imageTag);
    return args;
  }
}
