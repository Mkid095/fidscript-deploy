import { RegistryAccountService } from './registry-account.service';
import { ServiceUnavailableException } from '@nestjs/common';

/**
 * The registry account link, at the provider seam.
 *
 * The rules that keep this honest: the registry password is generated here,
 * encrypted, and never returned; the token is the only thing that leaves; a
 * registry that cannot be reached is reported as not linked, never as
 * linked; and the wire protocol itself is not this service's concern.
 */

interface Row {
  userId: string;
  registryUser?: string;
  passwordEnc?: string;
  linkedAt?: Date;
}

function makeService(opts: {
  rows?: Row[];
  provision?: (...args: any[]) => Promise<any>;
  decryptFails?: boolean;
}) {
  const rows = opts.rows ?? [];
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
    decrypt: jest.fn((s: string) => (opts.decryptFails ? undefined : s.replace(/^enc:/, ''))),
  };
  const provider: any = {
    provision: jest.fn(opts.provision ?? (async () => ({ ok: true, token: 'verdaccio.token.here' }))),
    address: jest.fn().mockReturnValue({ registryUrl: 'https://registry.example.com', tokenUrl: 'https://registry.example.com/-/static/token' }),
    revocation: 'user-side-only',
  };
  if (opts.decryptFails) crypto.decrypt.mockImplementation(() => { throw new Error('key gone'); });
  const service = new RegistryAccountService(prisma, crypto, provider);
  return { service, prisma, crypto, provider, address: provider.address };
}

describe('registry account link', () => {
  it('on first link, generates the password, stores it encrypted, and returns the token — never the password', async () => {
    const { service, prisma, provider } = makeService({
      provision: async (name, password) => ({ ok: true, token: 'verdaccio.token.here' }),
    });
    const result = await service.link('u1');
    expect(result).toEqual({
      registryUrl: 'https://registry.example.com',
      registryUser: 'op@example.com',
      registryToken: 'verdaccio.token.here',
      linked: true,
    });
    // The platform kept the password, encrypted.
    const created = prisma.userRegistryCredential.create.mock.calls[0][0].data;
    expect(created.registryUser).toBe('op@example.com');
    expect(created.passwordEnc).toMatch(/^enc:/);
    // The password itself is nowhere in the answer.
    expect(JSON.stringify(result)).not.toContain(created.passwordEnc.slice(4));
    // A first link asks the provider to create, not to sign in.
    const [name, password, login] = provider.provision.mock.calls[0];
    expect(name).toBe('op@example.com');
    expect(password).toHaveLength(32);
    expect(login).toBe(false);
  });

  it('re-links by signing the account in with the stored password and stamps last used', async () => {
    const { service, prisma, provider } = makeService({
      rows: [{ userId: 'u1', registryUser: 'op@example.com', passwordEnc: 'enc:stored' }],
      provision: async () => ({ ok: true, token: 'fresh' }),
    });
    const result = await service.link('u1');
    expect(result.registryToken).toBe('fresh');
    expect(prisma.userRegistryCredential.update).toHaveBeenCalled();
    // The stored password, decrypted, is what signs the account in.
    const [name, password, login] = provider.provision.mock.calls[0];
    expect(name).toBe('op@example.com');
    expect(password).toBe('stored');
    expect(login).toBe(true);
  });

  it('says so plainly when the stored password no longer opens the account', async () => {
    const { service } = makeService({
      rows: [{ userId: 'u1', registryUser: 'op@example.com', passwordEnc: 'enc:stale' }],
      provision: async () => ({ ok: false, rejected: true }),
    });
    await expect(service.link('u1')).rejects.toThrow(/out of sync/);
  });

  it('when the stored credential cannot be read, the link must be re-made, not guessed', async () => {
    const { service, provider } = makeService({
      rows: [{ userId: 'u1', registryUser: 'op@example.com', passwordEnc: 'enc:gone' }],
      decryptFails: true,
    });
    await expect(service.link('u1')).rejects.toThrow(/can no longer be read/);
    expect(provider.provision).not.toHaveBeenCalled();
  });

  it('reports a registry account that exists but is not platform-managed — and says how to link it anyway', async () => {
    const { service, prisma } = makeService({
      rows: [],
      provision: async () => ({ ok: false, alreadyRegistered: true }),
    });
    await expect(service.link('u1')).rejects.toThrow(/already has an account/);
    expect(prisma.userRegistryCredential.create).not.toHaveBeenCalled();
  });

  it('reports a registry that does not answer as not linked — it is never guessed', async () => {
    const { service, prisma } = makeService({
      rows: [],
      provision: async () => ({ ok: false, error: 'the registry at x did not answer: fetch failed' }),
    });
    await expect(service.link('u1')).rejects.toBeInstanceOf(ServiceUnavailableException);
    await expect(service.link('u1')).rejects.toThrow(/Nothing was linked/i);
    expect(prisma.userRegistryCredential.create).not.toHaveBeenCalled();
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
