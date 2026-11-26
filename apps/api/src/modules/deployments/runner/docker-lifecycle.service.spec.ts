import { DockerLifecycleService } from './docker-lifecycle.service';

/**
 * Stopping a deployment is a desired state, not an event.
 *
 * A deployment whose container is already gone — torn down by teardown,
 * crashed, its project deleted — is *already* in the stopped state, and
 * asking for it is a confirmation, not an error. The old behavior 500'd
 * the operator for asking for the state they wanted.
 */
describe('stopping a container', () => {
  function makeService(execResults: Array<string | Error>) {
    let callNo = 0;
    const exec = jest.fn((cmd: string): string => {
      const next = execResults[callNo++] ?? '';
      if (next instanceof Error) throw next;
      return next;
    });
    const service = new DockerLifecycleService();
    // The private exec helper is the only surface the test drives.
    (service as unknown as { exec: unknown }).exec = exec;
    return { service, exec };
  }

  it('stops a container that is there', async () => {
    const { service, exec } = makeService(['running', '']);
    await service.stop('fidscript-site-abc123');
    // Two probes: the existence check first, then the stop.
    expect(exec).toHaveBeenCalledTimes(2);
    expect(String((exec.mock.calls[1] as unknown[])[0])).toContain(
      'docker stop fidscript-site-abc123',
    );
  });

  it('is a no-op when the container is already gone — no error, no stop', async () => {
    const { service, exec } = makeService(['missing']);
    await expect(service.stop('fidscript-site-gone456')).resolves.toBeUndefined();
    // Only the existence probe ran; docker stop was never attempted.
    expect(exec).toHaveBeenCalledTimes(1);
    expect(String((exec.mock.calls[0] as unknown[])[0])).not.toContain('docker stop');
  });
});
