import { GithubWebhookService } from './github-webhook.service';

/**
 * Unregistering a project's GitHub webhook when the project goes away.
 *
 * Best-effort: without a token, or when GitHub refuses, the hook simply
 * stays registered — it is inert, because a deleted project no longer
 * matches incoming pushes. The tests pin each of those outcomes.
 */
describe('unregistering a project webhook', () => {
  function makeService(options: {
    connection?: { encryptedToken?: string } | null;
    decryptResult?: string;
    fetchOk?: boolean;
    fetchThrows?: boolean;
  }) {
    const updateMany = jest.fn(async () => ({ count: 1 }));
    const findUnique = jest.fn(
      async () => options.connection ?? null,
    );
    const prisma = {
      githubConnection: { findUnique },
      project: { updateMany },
    };
    const decrypt = jest.fn(() => options.decryptResult ?? 'tok');
    const service = new GithubWebhookService(
      prisma as never,
      { decrypt } as never,
      { get: jest.fn() } as never,
    );
    return { service, prisma, decrypt, updateMany };
  }

  const ctx = {
    projectId: 'p1',
    sourceRepo: 'https://github.com/acme/web',
    githubHookId: 42,
    ownerId: 'owner-1',
  };

  it('deletes the hook with the owner token and clears the project refs', async () => {
    let fetched = '';
    global.fetch = jest.fn(async (_url: unknown, init?: RequestInit) => {
      fetched = String(init?.method);
      return new Response('ok', { status: 200 });
    }) as never;
    const { service, updateMany, decrypt } = makeService({ connection: { encryptedToken: 'enc' } });

    const result = await service.unregisterWebhook(ctx);

    expect(decrypt).toHaveBeenCalledWith('enc');
    expect(fetched).toBe('DELETE');
    expect(result).toBe('unregistered');
    expect(updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'p1' },
        data: { githubHookId: null, webhookSecret: null },
      }),
    );
  });

  it('leaves the hook in place, inert, when the owner has no token', async () => {
    const { service, prisma } = makeService({ connection: null });
    const result = await service.unregisterWebhook(ctx);
    expect(result).toBe('nothing');
    expect((prisma.project.updateMany as jest.Mock)).not.toHaveBeenCalled();
  });

  it('reports a refused deletion but does not throw', async () => {
    global.fetch = jest.fn(async () => new Response('nope', { status: 404 })) as never;
    const { service } = makeService({ connection: { encryptedToken: 'enc' } });
    const result = await service.unregisterWebhook(ctx);
    expect(result).toBe('failed');
  });

  it('is a no-op when the project has no GitHub repo or hook', async () => {
    const { service } = makeService({ connection: { encryptedToken: 'enc' } });
    const result = await service.unregisterWebhook({
      projectId: 'p1',
      sourceRepo: null,
      githubHookId: null,
      ownerId: 'owner-1',
    });
    expect(result).toBe('nothing');
  });
});
