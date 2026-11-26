import { FunctionsHealthChecker } from './functions.checker';
import type { Project } from '@prisma/client';

const project = { id: 'p1' } as unknown as Project;

function make(functions: unknown, lastLog: unknown) {
  const prisma: any = {
    function: { findMany: jest.fn().mockResolvedValue(functions) },
    functionLog: { findFirst: jest.fn().mockResolvedValue(lastLog) },
  };
  return new FunctionsHealthChecker(prisma);
}

const fn = (status: string, name = 'handler') => ({ id: 'f1', name, status, updatedAt: new Date() });

describe('functions health', () => {
  it('is not configured when the project has no functions', async () => {
    const h = await make([], null).check(project);
    expect(h.state).toBe('not_configured');
    expect(h.configured).toBe(false);
  });

  it('is healthy when every function is deployed and the newest call succeeded', async () => {
    const h = await make(
      [fn('deployed')],
      { status: 'success', createdAt: new Date() },
    ).check(project);
    expect(h.state).toBe('healthy');
  });

  it('is degraded when a function exists but has never been deployed', async () => {
    const h = await make([fn('deployed'), fn('created', 'worker')], null).check(project);
    expect(h.state).toBe('degraded');
    expect(h.reason).toContain('worker');
  });

  it('is degraded when the newest invocation failed, and names why', async () => {
    const h = await make(
      [fn('deployed')],
      { status: 'error', errorMessage: 'ReferenceError: foo is not defined', createdAt: new Date() },
    ).check(project);
    expect(h.state).toBe('degraded');
    expect(h.reason).toContain('ReferenceError');
  });
});
