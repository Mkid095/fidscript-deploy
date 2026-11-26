jest.mock('child_process', () => ({
  ...jest.requireActual('child_process'),
  execSync: jest.fn(),
}));
import { execSync } from 'child_process';

import { DeploymentGcService } from './deployment-gc.service';
import { Logger } from '@nestjs/common';

const execMock = execSync as unknown as jest.Mock;

function configWith(overrides: Record<string, string | undefined>) {
  return { get: jest.fn((k: string, d?: unknown) => overrides[k] ?? d) } as never;
}

/**
 * The GC that frees nothing is only useful if it says so.
 *
 * When the root disk sits above the watermark after a full GC pass —
 * meaning the growth is data, not reclaimable Docker space — the operator
 * gets told, because no scheduled job will save the machine from that.
 */
describe('the GC’s disk watermark', () => {
  function makeService({ diskLine, config }: { diskLine: string; config: Record<string, string | undefined> }) {
    execMock.mockImplementation((cmd: string) =>
      String(cmd).includes('df -B1 -P /') ? Buffer.from(diskLine) : Buffer.from(''),
    );
    // Keep the heavy GC steps from touching the real world in tests.
    const lifecycle = {
      gc: jest.fn(() => ({ imagesFreed: 0, cacheFreedMB: 0 })),
    } as never;
    const prisma = {
      project: { findMany: jest.fn().mockResolvedValue([]) },
      $executeRaw: jest.fn().mockResolvedValue(0),
    } as never;
    const service = new DeploymentGcService(lifecycle, prisma, configWith(config));
    return { service };
  }

  const dfLine = (usedBytes: number, totalBytes: number) =>
    `Filesystem 1-byte-blocks Used\n/dev/sda1 ${totalBytes} ${usedBytes} 1000000000 80% /`;

  it('says nothing while the disk is under the watermark', async () => {
    const { service } = makeService({
      diskLine: dfLine(70 * 1e9, 100 * 1e9), // 70%
      config: { DOCKER_SPACE_ALERT_PCT: '90' },
    });
    const errorSpy = jest.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
    await (service as unknown as { runGc(): Promise<unknown> }).runGc();
    expect(errorSpy).not.toHaveBeenCalled();
    errorSpy.mockRestore();
  });

  it('cries out at and above the watermark', async () => {
    const { service } = makeService({
      diskLine: dfLine(92 * 1e9, 100 * 1e9), // 92%
      config: { DOCKER_SPACE_ALERT_PCT: '90' },
    });
    const errorSpy = jest.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
    await (service as unknown as { runGc(): Promise<unknown> }).runGc();
    expect(errorSpy).toHaveBeenCalledWith(expect.stringContaining('92%'));
    errorSpy.mockRestore();
  });
});
