import { RegistryAccountService } from './registry-account.service';
import { ServiceUnavailableException } from '@nestjs/common';
import { Prisma } from '@prisma/client';

/**
 * The registry account link, at the provider seam.
 *
 * The rules that keep this honest: the registry password is generated here,
 * encrypted, and never returned; the token is the only thing that leaves;
 * an unlink revokes the registry user, and says when it cannot; a registry
 * username is one account's, and a collision is reported, not queued; and
 * the wire protocol itself is not this service's concern.
 */

interface Row {
  userId: string;
  registryUser?: string;
  passwordEnc?: string;
  linkedAt?: Date;
}

function makeService(opts: {
  rows?: Row[];
  holder?: Row | null;
  provision?: (...args: any[]) => Promise<any>;
  revoke?: (...args: any[]) => Promise<any>;
  revokeFailsHard?: boolean;
  decryptFails?: boolean;
  createThrowsP2002?: boolean;
}) {
  const rows = opts.rows ?? [];
  const user = { user: { findUnique: jest.fn().mockResolvedValue({ id: 'u1', email: 'op@example.com' }) } };
  const prisma: any = {
    ...user,
    userRegistryCredential: {
      findUnique: jest.fn().mockImplementation(async ({ where }: any) => {
        // The two lookups this service makes, keyed by their `where`.
        if (where.registryUser) {
          return opts.holder ?? null;
        }
        return rows.find((r) => r.userId === where.userId) ?? null;
      }),
      create: jest
        .fn()
        .mockImplementation(
          opts.createThrowsP2002
            ? async () => {
                throw new Prisma.PrismaClientKnownRequestError('unique', { code: 'P2002', meta: {} } as any);
              }
            : async () => ({}),
        ),
      update: jest.fn().mockResolvedValue({}),
      deleteMany: jest.fn().mockResolvedValue({ count: 1 }),
    },
  };
  const crypto: any = {
    encrypt: jest.fn((s: string) => `enc:${s}`),
    decrypt: jest.fn((s: string) => s.replace(/^enc:/, '')),
  };
  if (opts.decryptFails) {
    crypto.decrypt.mockImplementation(() => {
      throw new Error('key gone');
    });
  }
  const provider: any = {
    provision: jest.fn(opts.provision ?? (async () => ({ ok: true, token: 'verdaccio.token.here' }))),
    revoke: jest.fn(
      opts.revoke ??
        (async () =>
          opts.revokeFailsHard
            ? { ok: false, error: 'the registry user database could not be updated: EACCES' }
            : { ok: true }),
    ),
    revocation: opts.revokeFailsHard ? 'supported' : 'supported',
    address: jest.fn().mockReturnValue({ registryUrl: 'https://registry.example.com', tokenUrl: 'https://registry.example.com/-/static/token' }),
  };
  const service = new RegistryAccountService(prisma, crypto, provider);
  return { service, prisma, crypto, provider };
}

describe('registry account link', () => {
  it('on first link, generates the password, stores it encrypted, and returns the token — never the password', async () => {
    const { service, prisma, provider } = makeService({
      holder: null,
      provision: async (name, password) => ({ ok: true, token: 'verdaccio.token.here' }),
    });
    const result = await service.link('u1');
    expect(result).toEqual({
      registryUrl: 'https://registry.example.com',
      registryUser: 'op.example.com',
      registryToken: 'verdaccio.token.here',
      linked: true,
    });
    // The platform kept the password, encrypted, under the registry's own
    // spelling of the name (the @ is not a legal registry username).
    const created = prisma.userRegistryCredential.create.mock.calls[0][0].data;
    expect(created.registryUser).toBe('op.example.com');
    expect(created.passwordEnc).toMatch(/^enc:/);
    // The password itself is nowhere in the answer.
    expect(JSON.stringify(result)).not.toContain(created.passwordEnc.slice(4));
    // A first link asks the provider to create, not to sign in.
    const [name, password, login] = provider.provision.mock.calls[0];
    expect(name).toBe('op.example.com');
    expect(password).toHaveLength(32);
    expect(login).toBe(false);
  });

  it('re-links using the stored registry user (canonical) and the stored password', async () => {
    const { service, prisma, provider } = makeService({
      rows: [{ userId: 'u1', registryUser: 'op.other-domain.example.com', passwordEnc: 'enc:stored' }],
      provision: async () => ({ ok: true, token: 'fresh' }),
    });
    const result = await service.link('u1');
    expect(result.registryToken).toBe('fresh');
    expect(result.registryUser).toBe('op.other-domain.example.com');
    expect(prisma.userRegistryCredential.update).toHaveBeenCalled();
    // The stored password, decrypted, is what signs the account in — under
    // the stored name, not the email the user has now.
    const [name, password, login] = provider.provision.mock.calls[0];
    expect(name).toBe('op.other-domain.example.com');
    expect(password).toBe('stored');
    expect(login).toBe(true);
  });

  it('says so plainly when the stored password no longer opens the account', async () => {
    const { service } = makeService({
      rows: [{ userId: 'u1', registryUser: 'op.example.com', passwordEnc: 'enc:stale' }],
      provision: async () => ({ ok: false, rejected: true }),
    });
    await expect(service.link('u1')).rejects.toThrow(/out of sync/);
  });

  it('when the stored credential cannot be read, the link must be re-made, not guessed', async () => {
    const { service, provider } = makeService({
      rows: [{ userId: 'u1', registryUser: 'op.example.com', passwordEnc: 'enc:gone' }],
      decryptFails: true,
    });
    await expect(service.link('u1')).rejects.toThrow(/can no longer be read/);
    expect(provider.provision).not.toHaveBeenCalled();
  });

  it('reports a registry account that exists but is not platform-managed — and says how to link it anyway', async () => {
    const { service, prisma } = makeService({
      rows: [],
      holder: null,
      provision: async () => ({ ok: false, alreadyRegistered: true }),
    });
    await expect(service.link('u1')).rejects.toThrow(/does not manage/);
    expect(prisma.userRegistryCredential.create).not.toHaveBeenCalled();
  });

  it('a second account mapping to a taken username is refused, not queued', async () => {
    const { service, prisma } = makeService({
      rows: [],
      holder: { userId: 'u2', registryUser: 'op.example.com', passwordEnc: 'enc:theirs' },
    });
    await expect(service.link('u1')).rejects.toThrow(/already in use by another/);
    expect(prisma.userRegistryCredential.create).not.toHaveBeenCalled();
  });

  it('losing the race on the unique index is a refusal too', async () => {
    const { service, prisma } = makeService({
      rows: [],
      holder: null,
      provision: async () => ({ ok: true, token: 't' }),
      createThrowsP2002: true,
    });
    await expect(service.link('u1')).rejects.toThrow(/taken by another/);
    expect(prisma.userRegistryCredential.create).toHaveBeenCalled();
  });

  it('reports a registry that does not answer as not linked — it is never guessed', async () => {
    const { service, prisma } = makeService({
      rows: [],
      holder: null,
      provision: async () => ({ ok: false, error: 'the registry at x did not answer: fetch failed' }),
    });
    await expect(service.link('u1')).rejects.toBeInstanceOf(ServiceUnavailableException);
    await expect(service.link('u1')).rejects.toThrow(/Nothing was linked/i);
    expect(prisma.userRegistryCredential.create).not.toHaveBeenCalled();
  });

  it('status: linked when a row exists, not linked when it does not', async () => {
    const { service } = makeService({
      rows: [{ userId: 'u1', registryUser: 'op.example.com', passwordEnc: 'enc:x', linkedAt: new Date() }],
    });
    await expect(service.status('u1')).resolves.toMatchObject({ linked: true, registryUser: 'op.example.com' });
    const empty = makeService({ rows: [] });
    await expect(empty.service.status('nobody')).resolves.toEqual({ linked: false, registryUrl: 'https://registry.example.com' });
  });
});

describe('registry account unlink — revocation, not just forgetting', () => {
  it('revokes the registry user, then forgets the password', async () => {
    const { service, prisma, provider } = makeService({
      rows: [{ userId: 'u1', registryUser: 'op.example.com', passwordEnc: 'enc:x' }],
    });
    const result = await service.unlink('u1');
    expect(result).toEqual({ linked: false, revoked: true, registryUser: 'op.example.com', note: undefined });
    expect(provider.revoke).toHaveBeenCalledWith('op.example.com');
    expect(prisma.userRegistryCredential.deleteMany).toHaveBeenCalledWith({ where: { userId: 'u1' } });
  });

  it('when revocation is user-side-only, the link is unlinked on the platform and said so', async () => {
    const { service, prisma, provider } = makeService({
      rows: [{ userId: 'u1', registryUser: 'op.example.com', passwordEnc: 'enc:x' }],
      revoke: async () => ({ ok: false, unsupported: true, error: 'the registry admin must delete the user' }),
    });
    const result = await service.unlink('u1');
    expect(result.revoked).toBe(false);
    expect(result.note).toMatch(/registry admin/);
    expect(prisma.userRegistryCredential.deleteMany).toHaveBeenCalled();
  });

  it('when the registry refuses the revocation, the link stays in place and says why', async () => {
    const { service, prisma, provider } = makeService({
      rows: [{ userId: 'u1', registryUser: 'op.example.com', passwordEnc: 'enc:x' }],
      revokeFailsHard: true,
    });
    await expect(service.unlink('u1')).rejects.toThrow(/could not be revoked/);
    expect(prisma.userRegistryCredential.deleteMany).not.toHaveBeenCalled();
  });

  it('unlinking an account that is not linked is a quiet no-op', async () => {
    const { service } = makeService({ rows: [] });
    await expect(service.unlink('u1')).resolves.toEqual({ linked: false, revoked: false });
  });

  it('revoke() — the deletion path — kills the registry side and leaves the row to the cascade', async () => {
    const { service, prisma, provider } = makeService({
      rows: [{ userId: 'u1', registryUser: 'op.example.com', passwordEnc: 'enc:x' }],
    });
    await expect(service.revoke('u1')).resolves.toEqual({ revoked: true });
    expect(provider.revoke).toHaveBeenCalledWith('op.example.com');
    expect(prisma.userRegistryCredential.deleteMany).not.toHaveBeenCalled();
    const noRow = makeService({ rows: [] });
    await expect(noRow.service.revoke('u1')).resolves.toEqual({ revoked: false });
  });
});
