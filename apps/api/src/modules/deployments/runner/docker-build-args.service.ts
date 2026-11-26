import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DeploymentProfile, RuntimeEnv } from '../types/deployment-profile';

@Injectable()
export class DockerBuildArgsService {
  private readonly APP_NETWORK = 'fidscript-app';
  /**
   * The platform's own ceilings, when a project has not set its own. The
   * host runs the platform and every project on it, so nothing a project
   * runs may take the machine down with it; these are the floor of safety,
   * and a project may only claim more, never "no ceiling".
   */
  private static readonly DEFAULT_MEMORY_MB = 512;
  private static readonly DEFAULT_CPU_MILLICPU = 1000;
  /** The most a single project's container may ever claim. */
  private static readonly MAX_MEMORY_MB = 8192;
  private static readonly MAX_CPU_MILLICPU = 8000;

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
    /** The project's own memory ceiling, in MB. Absent: the platform default. */
    memoryLimitMb?: number;
    /** The project's own CPU ceiling, in millicpus. Absent: the platform default. */
    cpuLimitMillicpu?: number;
  }): string[] {
    const { imageTag, containerName, envVars, profile, domain } = opts;
    const port = opts.port ?? profile.defaultPort;
    // First element is the `docker` subcommand; the caller spawns `docker`
    // directly with execFileSync (no shell) so Traefik labels and env values
    // pass through verbatim. Do NOT join into a string + sh.
    const memoryMb = this.clamp(opts.memoryLimitMb, DockerBuildArgsService.DEFAULT_MEMORY_MB, DockerBuildArgsService.MAX_MEMORY_MB);
    const cpuMillicpu = this.clamp(opts.cpuLimitMillicpu, DockerBuildArgsService.DEFAULT_CPU_MILLICPU, DockerBuildArgsService.MAX_CPU_MILLICPU);
    const args = [
      'run', '--name', containerName, '--restart', 'unless-stopped',
      '--security-opt', 'no-new-privileges', '--read-only',
      '--tmpfs', '/tmp:rw,noexec,nosuid,size=64m',
      '--tmpfs', '/storage:rw,noexec,nosuid,size=128m',
      '--memory', `${memoryMb}m`, '--memory-swap', `${memoryMb}m`,
      '--cpus', String(DockerBuildArgsService.millicpuToCpus(cpuMillicpu)),
      '--network', this.APP_NETWORK,
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

  /**
   * A value a person chose, clamped into the platform's safe band; a value
   * that is not a finite number falls back to the default. The band is the
   * whole point: a project may claim more than the default, but never "no
   * ceiling", and never more than the band's top.
   */
  private clamp(value: number | undefined, fallback: number, max: number): number {
    if (typeof value !== 'number' || !Number.isFinite(value)) return fallback;
    return Math.min(Math.max(Math.round(value), 1), max);
  }

  /** Millicpus into the `--cpus` form: 1000 → "1", 500 → "0.5", 1500 → "1.5". */
  private static millicpuToCpus(millicpu: number): string {
    const cores = millicpu / 1000;
    return Number.isInteger(cores) ? String(cores) : cores.toFixed(3).replace(/\.?0+$/, '');
  }
}
