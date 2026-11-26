import { DockerBuildArgsService } from './docker-build-args.service';
import { getProfile } from '../types/deployment-profile';

/**
 * The envelope a project's container runs in.
 *
 * The rules the host lives on: every container gets the security flags
 * (read-only, no new privileges), the ceilings (memory, CPUs, the tmpfs
 * sizes), and only the platform's own flags reach `docker run` — a
 * project's build commands and environment can change what the
 * application does, never the envelope it does it in.
 */
describe('the run arguments', () => {
  const service = new DockerBuildArgsService({ get: () => 'letsencrypt-dns' } as never);
  const profile = getProfile('NODE');

  const base = {
    imageTag: 'fidscript/soostori:v1',
    containerName: 'fidscript-soostori-deployment-1',
    projectSlug: 'soostori',
    envVars: [] as { key: string; value: string }[],
    profile,
    domain: 'soostori.apps.fidscript.com',
    port: 3000,
  };

  it('starts every container under the platform defaults', () => {
    const args = service.buildRunArgs(base);
    const memory = args[args.indexOf('--memory') + 1];
    const swap = args[args.indexOf('--memory-swap') + 1];
    const cpus = args[args.indexOf('--cpus') + 1];
    expect(memory).toBe('512m');
    expect(swap).toBe('512m');
    expect(cpus).toBe('1');
  });

  it('binds a project to its own ceilings', () => {
    const args = service.buildRunArgs({
      ...base,
      memoryLimitMb: 2048,
      cpuLimitMillicpu: 2500,
    });
    expect(args[args.indexOf('--memory') + 1]).toBe('2048m');
    expect(args[args.indexOf('--memory-swap') + 1]).toBe('2048m');
    expect(args[args.indexOf('--cpus') + 1]).toBe('2.5');
  });

  it('lets a project claim less than the default', () => {
    const args = service.buildRunArgs({
      ...base,
      memoryLimitMb: 128,
      cpuLimitMillicpu: 50,
    });
    expect(args[args.indexOf('--memory') + 1]).toBe('128m');
    expect(args[args.indexOf('--cpus') + 1]).toBe('0.05');
  });

  it('never lets a project claim more than the platform band', () => {
    const args = service.buildRunArgs({
      ...base,
      memoryLimitMb: 1048576,
      cpuLimitMillicpu: 100000,
    });
    expect(args[args.indexOf('--memory') + 1]).toBe('8192m');
    expect(args[args.indexOf('--cpus') + 1]).toBe('8');
  });

  it('treats a nonsense value as the default, not as a hole in the ceiling', () => {
    const args = service.buildRunArgs({
      ...base,
      memoryLimitMb: Number.NaN,
      cpuLimitMillicpu: Number.NaN,
    });
    expect(args[args.indexOf('--memory') + 1]).toBe('512m');
    expect(args[args.indexOf('--cpus') + 1]).toBe('1');
  });

  it('keeps the security flags on every container', () => {
    const args = service.buildRunArgs(base);
    expect(args).toContain('--read-only');
    expect(args[args.indexOf('--security-opt') + 1]).toBe('no-new-privileges');
    expect(args).toContain('fidscript-app');
  });
});
