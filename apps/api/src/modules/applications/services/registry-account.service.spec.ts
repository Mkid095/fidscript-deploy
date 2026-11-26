import { RegistryAccountService } from './registry-account.service';
import { ServiceUnavailableException } from '@nestjs/common';

/**
 * The registry account link.
 *
 * The rules that keep this honest: the registry password is generated here,
 * encrypted, and never returned; the token is the only thing that leaves;
 * and a registry that cannot be reached is reported as not linked, never as
 * linked.
 */

interface Row {
  userId: string;
  registryUser?: string;
  passwordEnc?: string;
  linkedAt?: Date;
}

function makeService(opts: { rows?: Row[]; fetchImpl?: (...args: any[]) => Promise<any>; internalUrl?: string }) {
  const rows = opts.rows ?? [];
  const internalUrl = opts.internalUrl ?? 'http://nextmavens-verdaccio:4873';
  const user = { user: { findUnique: jest.fn().mockResolvedValue({ id: 'u1', email: 'op@example.com' }) } };
  const prisma: any = {
    ...user,
    userRegistryCredential: {
      findUnique: jest.fn().mockImplementation(async ({ where }: any) =>
        rows.find((r) => r.userId === where.userId) ?? null,
      ),
      create: jest.fn().mockResolvedValue({}),
      update: jest.fn().mockResolvedValue({}),
      deleteMany: jest.fn().mockResolvedValue({ count: 1 }),
    },
  };
  const crypto: any = {
    encrypt: jest.fn((s: string) => `enc:${s}`),
    decrypt: jest.fn((s: string) => s.replace(/^enc:/, '')),
  };
  const config: any = {
    get: jest.fn((key: string, fallback?: string) =>
      key === 'REGISTRY_INTERNAL_URL' ? internalUrl : fallback,
    ),
  };
  const registry: any = {
    addresses: jest.fn().mockReturnValue({ registryUrl: 'https://registry.example.com', tokenUrl: 'x' }),
  };
  const service = new RegistryAccountService(prisma, crypto, config, registry);
  global.fetch = jest.fn().mockImplementation(opts.fetchImpl ?? (async () => new Response('', { status: 500 })));
  return { service, prisma, crypto, fetch: global.fetch as jest.Mock, config };
}

const TOKEN = 'verdaccio.token.here';
const body = (r: any) => JSON.parse(r.body);

describe('registry account link', () => {
  it('on first link, generates the password, stores it encrypted, and returns the token — never the password', async () => {
    const { service, prisma, fetch } = makeService({
      rows: [],
      fetchImpl: async () =>
        new Response(JSON.stringify({ token: TOKEN, ok: true }), { status: 201, headers: { 'Content-Type': 'application/json' } }),
    });
    const result = await service.link('u1');
    expect(result).toEqual({
      registryUrl: 'https://registry.example.com',
      registryUser: 'op@example.com',
      registryToken: TOKEN,
      linked: true,
    });
    // The platform kept the password, encrypted.
    const created = prisma.userRegistryCredential.create.mock.calls[0][0].data;
    expect(created.registryUser).toBe('op@example.com');
    expect(created.passwordEnc).toMatch(/^enc:/);
    // The password itself is nowhere in the answer.
    expect(JSON.stringify(result)).not.toContain(created.passwordEnc.slice(4));
    // The wire request is the npm-protocol user endpoint for the user's email.
    const [url, init] = fetch.mock.calls[0];
    expect(url).toBe(`${'http://nextmavens-verdaccio:4873'}/-/user/org.couchdb.user:op%40example.com`);
    expect(body(init).password).toHaveLength(32);
  });

  it('re-links with the stored password and stamps last used', async () => {
    const { service, prisma, fetch } = makeService({
      rows: [{ userId: 'u1', registryUser: 'op@example.com', passwordEnc: 'enc:stored' }],
      fetchImpl: async () =>
        new Response(JSON.stringify({ token: 'fresh' }), { status: 201, headers: { 'Content-Type': 'application/json' } }),
    });
    const result = await service.link('u1');
    expect(result.registryToken).toBe('fresh');
    expect(prisma.userRegistryCredential.update).toHaveBeenCalled();
    // The stored password, decrypted, is what mints the token.
    expect(JSON.parse(fetch.mock.calls[0][1].body).password).toBe('stored');
  });

  it('reports a registry account that exists but is not platform-managed — and says how to link it anyway', async () => {
    const { service, prisma } = makeService({
      rows: [],
      fetchImpl: async () => new Response('user exists', { status: 409 }),
    });
    await expect(service.link('u1')).rejects.toThrow(/already has an account/);
    expect(prisma.userRegistryCredential.create).not.toHaveBeenCalled();
  });

  it('reports a registry that does not answer as not linked — it is never guessed', async () => {
    const { service, prisma } = makeService({
      rows: [],
      fetchImpl: () => Promise.reject(new Error('fetch failed')),
    });
    await expect(service.link('u1')).rejects.toBeInstanceOf(ServiceUnavailableException);
    await expect(service.link('u1')).rejects.toThrow(/not linked|Nothing was linked/i);
    expect(prisma.userRegistryCredential.create).not.toHaveBeenCalled();
  });

  it('says so plainly when the stored credentials no longer open the registry', async () => {
    const { service } = makeService({
      rows: [{ userId: 'u1', registryUser: 'op@example.com', passwordEnc: 'enc:stale' }],
      fetchImpl: async () => new Response('unauthorized', { status: 401 }),
    });
    await expect(service.link('u1')).rejects.toThrow(/out of sync/);
  });

  it('status: linked when a row exists, not linked when it does not', async () => {
    const { service } = makeService({
      rows: [{ userId: 'u1', registryUser: 'op@example.com', passwordEnc: 'enc:x', linkedAt: new Date() }],
    });
    await expect(service.status('u1')).resolves.toMatchObject({ linked: true, registryUser: 'op@example.com' });
    const empty = makeService({ rows: [] });
    await expect(empty.service.status('nobody')).resolves.toEqual({ linked: false, registryUrl: 'https://registry.example.com' });
  });

  it('unlink forgets the platform copy; the registry account itself is left alone', async () => {
    const { service, prisma } = makeService({ rows: [{ userId: 'u1' }] });
    await expect(service.unlink('u1')).resolves.toEqual({ linked: false });
    expect(prisma.userRegistryCredential.deleteMany).toHaveBeenCalledWith({ where: { userId: 'u1' } });
  });
});
