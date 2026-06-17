import { Injectable } from '@nestjs/common';
import { DeploymentProfile, RuntimeEnv } from '../types/deployment-profile';

@Injectable()
export class DockerBuildArgsService {
  private readonly APP_NETWORK = 'fidscript-app';

  buildRunArgs(opts: {
    imageTag: string;
    containerName: string;
    projectSlug: string;
    envVars: RuntimeEnv[];
    profile: DeploymentProfile;
    domain: string;
  }): string[] {
    const { imageTag, containerName, envVars, profile, domain } = opts;
    const args = [
      'docker run', '--name', containerName, '--restart', 'unless-stopped',
      '--security-opt', 'no-new-privileges', '--read-only',
      '--tmpfs', '/tmp:rw,noexec,nosuid,size=64m',
      '--tmpfs', '/storage:rw,noexec,nosuid,size=128m',
      '--memory', '512m', '--cpus', '1', '--network', this.APP_NETWORK,
    ];
    for (const { key, value } of envVars) args.push('-e', `${key}=${value}`);
    if (!profile.requiresPort) { args.push('--detach', imageTag); return args; }
    args.push('-e', `PORT=${profile.defaultPort}`);
    if (profile.requiresRoute) {
      args.push(
        '-l', 'traefik.enable=true',
        '-l', `traefik.http.routers.${containerName}.rule=Host(\`${domain}\`)`,
        '-l', `traefik.http.routers.${containerName}.entrypoints=websecure`,
        '-l', `traefik.http.routers.${containerName}.tls=true`,
        '-l', `traefik.http.services.${containerName}.loadbalancer.server.port=${profile.defaultPort}`,
        '-l', `traefik.docker.network=${this.APP_NETWORK}`,
      );
    }
    args.push('--detach', imageTag);
    return args;
  }
}
