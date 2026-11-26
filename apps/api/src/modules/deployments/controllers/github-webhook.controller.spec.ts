import type { Request } from 'express';

import { GithubWebhookController } from './github-webhook.controller';

/**
 * Throttling the public receiver.
 *
 * The signature check is the lock; the limit is the gate on the door.
 * An address may not flood the receiver, a repository may not queue the
 * build lane — and a ping never spends the repository's bucket.
 */
describe('the webhook receiver, throttled', () => {
  function makeController(
    options: { ipAllowed?: boolean; repoAllowed?: boolean; signatureOk?: boolean } = {},
  ) {
    const { ipAllowed = true, repoAllowed = true, signatureOk = true } = options;
    const consumes: { key: string; limit: number; window: number }[] = [];
    const rateLimiter = {
      consume: jest.fn(async (key: string, limit: number, window: number) => {
        consumes.push({ key, limit, window });
        const isRepo = key.startsWith('rl:webhook:repo:');
        return {
          allowed: isRepo ? repoAllowed : ipAllowed,
          count: 1,
          retryAfter: isRepo || ipAllowed ? 0 : 600,
        };
      }),
    };

    const webhookService = {
      parsePushEvent: jest.fn().mockReturnValue({
        repoFullName: 'owner/repo',
        branch: 'main',
        commitSha: 'abc123',
        commitMessage: 'a commit',
      }),
      findProjectByRepo: jest.fn().mockResolvedValue({ id: 'project-1' }),
      verifySignature: jest.fn().mockReturnValue(signatureOk),
      evaluatePush: jest.fn().mockResolvedValue({ outcome: 'accepted' }),
      recordOutcome: jest.fn().mockResolvedValue(undefined),
    };
    const crudService = { create: jest.fn().mockResolvedValue({}) };
    const prisma = {
      project: {
        findUnique: jest.fn().mockResolvedValue({
          id: 'project-1',
          ownerId: 'owner-1',
          sourceRepo: 'https://github.com/owner/repo.git',
          webhookSecret: 'secret',
          sourceBranch: 'main',
          autoDeploy: true,
          lastDeployedCommit: null,
        }),
      },
      domain: { findFirst: jest.fn().mockResolvedValue(null) },
    };

    const controller = new GithubWebhookController(
      webhookService as never,
      crudService as never,
      prisma as never,
      rateLimiter as never,
    );

    const res = { status: jest.fn().mockReturnThis(), set: jest.fn() };
    const req = {
      headers: { 'x-github-event': 'push' },
      body: {},
      ip: '203.0.113.5',
      res,
    } as unknown as Request;

    return { controller, req, res, consumes, webhookService, rateLimiter };
  }

  it('answers 429 when the address bucket is full, before touching the repo', async () => {
    const { controller, req, res, rateLimiter } = makeController({ ipAllowed: false });
    await controller.handleWebhook(req);
    expect(res.status).toHaveBeenCalledWith(429);
    expect(res.set).toHaveBeenCalledWith('Retry-After', '600');
    // Only the address bucket was consumed; the repository's was not.
    expect(rateLimiter.consume).toHaveBeenCalledTimes(1);
  });

  it('answers 429 when the repository bucket is full', async () => {
    const { controller, req, res, consumes } = makeController({ repoAllowed: false });
    const result = await controller.handleWebhook(req);
    expect(res.status).toHaveBeenCalledWith(429);
    expect(result.status).toBe('rate_limited');
    // Both buckets were consulted, the repo one last.
    expect(consumes.some((c) => c.key.startsWith('rl:webhook:repo:'))).toBe(true);
  });

  it('lets a normal push through and triggers the deployment', async () => {
    const { controller, req, webhookService } = makeController();
    const result = await controller.handleWebhook(req);
    expect(result.status).toBe('deploying');
    expect(webhookService.evaluatePush).toHaveBeenCalled();
  });

  it('never spends the repository bucket on a ping', async () => {
    const rateLimiter = {
      consume: jest.fn().mockResolvedValue({ allowed: true, count: 1, retryAfter: 0 }),
    };
    const webhookService = { parsePushEvent: jest.fn() };
    const controller = new GithubWebhookController(
      webhookService as never,
      {} as never,
      {} as never,
      rateLimiter as never,
    );
    const res = { status: jest.fn(), set: jest.fn() };
    const req = {
      headers: { 'x-github-event': 'ping' },
      body: {},
      ip: '203.0.113.5',
      res,
    } as unknown as Request;
    const result = await controller.handleWebhook(req);
    expect(result.status).toBe('pong');
    void res;
    // One consume: the address bucket only.
    expect(rateLimiter.consume).toHaveBeenCalledTimes(1);
  });
});
