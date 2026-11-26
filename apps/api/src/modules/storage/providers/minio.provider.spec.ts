import { MinioProvider } from './minio.provider';

/**
 * The storage connection probe.
 *
 * It must say "reachable" when the store answers, and name the failure
 * kind when it does not. The probe is a HEAD against a sentinel bucket —
 * `listBuckets` is not usable: the platform's object store is RustFS, and
 * the minio client's ListAllMyBuckets probe misparses its answer.
 */

function makeService(client: any) {
  const config: any = {
    get: jest.fn((key: string, fallback?: string) =>
      key === 'MINIO_ENDPOINT' ? 'minio:9000' : key === 'MINIO_EXTERNAL_ENDPOINT' ? 'minio:9000' : fallback,
    ),
  };
  const service = new MinioProvider(config, {} as any);
  // Bypass the async client init: hand the service a ready client.
  (service as any).client = client;
  return service;
}

describe('the storage probe', () => {
  it('is ok when the store answers, whatever the sentinel bucket exists or not', async () => {
    const client = { bucketExists: jest.fn().mockResolvedValue(false), listBuckets: jest.fn() };
    const result = await makeService(client).testConnection();
    expect(result.ok).toBe(true);
    expect(client.bucketExists).toHaveBeenCalledWith('fidscript-probe');
    // The broken probe is gone: it must never be the one asked.
    expect(client.listBuckets).not.toHaveBeenCalled();
  });

  it('says the credentials were rejected, not that the store is down', async () => {
    const client = {
      bucketExists: jest.fn().mockRejectedValue(new Error('S3 error: Access Denied')),
      listBuckets: jest.fn(),
    };
    const result = await makeService(client).testConnection();
    expect(result.ok).toBe(false);
    expect(result.error).toMatch(/rejected/i);
  });

  it('says the store cannot be reached when it does not answer at all', async () => {
    const client = {
      bucketExists: jest.fn().mockRejectedValue(new Error('request failed, reason: connect ECONNREFUSED 127.0.0.1:9000')),
      listBuckets: jest.fn(),
    };
    const result = await makeService(client).testConnection();
    expect(result.ok).toBe(false);
    expect(result.error).toMatch(/Cannot reach/i);
  });

  it('throws when the client was never initialized — the caller (the health check) sees that as "could not probe"', async () => {
    const service = makeService(null);
    await expect(service.testConnection()).rejects.toThrow(/not initialized/i);
  }, 10000);
});
