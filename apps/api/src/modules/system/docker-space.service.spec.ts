import { DockerSpaceService } from './docker-space.service';

jest.mock('child_process', () => ({
  ...jest.requireActual('child_process'),
  execSync: jest.fn(),
}));
import { execSync } from 'child_process';

const execMock = execSync as unknown as jest.Mock;

/**
 * The reclaim ladder only ever touches what the daemon calls
 * reclaimable — and the measurement that proves it is the machine's own
 * disk, not the daemon's bookkeeping.
 */

function makeService({
  dfBefore,
  dfAfter,
  dfLines,
  spaceLines,
}: {
  dfBefore: string;
  dfAfter: string;
  dfLines?: string;
  spaceLines?: string;
}) {
  // `df` is asked twice by a reclaim: before (used falls) and after.
  const dfOutputs = [dfBefore, dfAfter, ...(dfLines ? [dfLines] : [])];
  let dfCall = 0;
  execMock.mockImplementation((cmd: string) => {
    if (cmd === 'df -B1 -P /') {
      return Buffer.from(dfOutputs[Math.min(dfCall++, dfOutputs.length - 1)] ?? dfAfter);
    }
    if (cmd.includes('docker system df')) {
      return Buffer.from(spaceLines ?? '');
    }
    if (cmd.includes('docker system prune') || cmd.includes('docker builder prune')) {
      return Buffer.from('Total reclaimed space: 0B');
    }
    return Buffer.from('');
  });
  return new DockerSpaceService();
}

/** The shape `docker system df --format '{{json .}}'` really has. */
function spaceLinesJson() {
  return [
    JSON.stringify({ Type: 'Images', Total: 28, Active: 27, Size: '15.09GB', Reclaimable: '1.159GB (7%)' }),
    JSON.stringify({ Type: 'Build Cache', Total: 165, Active: 165, Size: '21.1GB', Reclaimable: '0B' }),
    JSON.stringify({ Type: 'Containers', Total: 31, Active: 31, Size: '7.045MB', Reclaimable: '0B (0%)' }),
    JSON.stringify({ Type: 'Local Volumes', Total: 20, Active: 20, Size: '2.686GB', Reclaimable: '0B (0%)' }),
  ].join('\n');
}

describe('reading the space report', () => {
  it('reads the daemon’s own numbers, reclaimable included', () => {
    const service = makeService({
      dfBefore: 'Filesystem 1024-blocks Used Available Capacity Mounted on\n/dev/sda1 80000000000 80000000000 0 100% /',
      dfAfter: 'Filesystem 1024-blocks Used Available Capacity Mounted on\n/dev/sda1 80000000000 80000000000 0 100% /',
      spaceLines: spaceLinesJson(),
    });
    const report = service.report();
    expect(report.docker.images).toEqual({ total: 15.09e9, reclaimable: 1.159e9 });
    expect(report.docker.buildCache).toEqual({ total: 21.1e9, reclaimable: 0 });
    expect(report.docker.volumes).toEqual({ total: 2.686e9, reclaimable: 0 });
    expect(report.disk.total).toBe(80000000000);
    expect(report.disk.used).toBe(80000000000);
    expect(report.disk.usedPercent).toBeGreaterThanOrEqual(80);
  });

  it('does not crash when the daemon answers nothing', () => {
    const service = makeService({ dfBefore: '', dfAfter: '', spaceLines: '' });
    const report = service.report();
    expect(report.docker.images.total).toBe(0);
    expect(report.disk.total).toBe(0);
  });
});

describe('the reclaim ladder', () => {
  it('touches only the safe steps, and measures against the machine’s own disk', () => {
    const service = makeService({
      // 80GB before, 77GB after → 3GB actually came back to the operator.
      dfBefore: 'Filesystem 1024-blocks Used Available Capacity Mounted on\n/dev/sda1 80000000000 80000000000 0 100% /',
      dfAfter: 'Filesystem 1024-blocks Used Available Capacity Mounted on\n/dev/sda1 80000000000 77000000000 0 96% /',
      spaceLines: spaceLinesJson(),
    });

    const result = service.reclaim();

    expect(result.reclaimedBytes).toBe(3e9);
    const commands = execMock.mock.calls.map((c) => String(c[0])).filter((c) => c.includes('docker'));
    expect(commands).toContain('docker system prune -f');
    expect(commands).toContain('docker builder prune -f');
    // The safety rule, asserted: no step may reach for volumes, tagged
    // images, or the aggressive --all cache sweep (that is the GC's).
    for (const cmd of commands) {
      expect(cmd).not.toContain('volumes');
      expect(cmd).not.toContain('image prune -a');
      expect(cmd).not.toContain('--all');
      expect(cmd).not.toContain('rm -f');
    }
  });

  it('reports zero (not a negative) when nothing was free', () => {
    const same = 'Filesystem 1024-blocks Used Available Capacity Mounted on\n/dev/sda1 80000000000 80000000000 0 100% /';
    const service = makeService({ dfBefore: same, dfAfter: same, spaceLines: spaceLinesJson() });
    expect(service.reclaim().reclaimedBytes).toBe(0);
  });
});
