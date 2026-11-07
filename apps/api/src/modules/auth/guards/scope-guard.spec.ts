import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ScopeGuard } from './scope-guard';
import { ProjectApiKeyMintGuard } from './project-api-key-mint.guard';

/**
 * Scopes, tested.
 *
 * A key's scopes were stored and never loaded, so every `@RequireScope` was a
 * no-op for a project key. And an account key holding `projects:read` could
 * mint a key with no scope restriction at all — escalating itself.
 */

function makeContext(user: any, body: any = {}) {
  return {
    switchToHttp: () => ({ getRequest: () => ({ user, body }) }),
    getHandler: () => 'handler',
    getClass: () => 'class',
  } as unknown as ExecutionContext;
}

function reflectorFor(scopes: string[]) {
  return {
    getAllAndOverride: jest.fn(() => scopes),
  } as unknown as Reflector;
}

describe('ScopeGuard', () => {
  it('allows a caller whose key carries the required scope', () => {
    const guard = new ScopeGuard(reflectorFor(['projects:read']));
    const user = { isApiKey: true, keyType: 'project', keyPermissions: ['projects:read'] };
    expect(guard.canActivate(makeContext(user))).toBe(true);
  });

  it('refuses a caller whose key lacks the required scope', () => {
    const guard = new ScopeGuard(reflectorFor(['projects:write']));
    const user = { isApiKey: true, keyType: 'project', keyPermissions: ['projects:read'] };
    expect(() => guard.canActivate(makeContext(user))).toThrow(ForbiddenException);
  });

  it('treats an empty scope list as "no scope restriction"', () => {
    const guard = new ScopeGuard(reflectorFor(['projects:write']));
    const user = { isApiKey: true, keyType: 'project', keyPermissions: [] };
    expect(guard.canActivate(makeContext(user))).toBe(true);
  });

  it('does not apply to a person — their rights are the project\'s', () => {
    const guard = new ScopeGuard(reflectorFor(['projects:write']));
    expect(guard.canActivate(makeContext({ userId: 'someone' }))).toBe(true);
  });
});

describe('ProjectApiKeyMintGuard', () => {
  const noScopes = reflectorFor([]);

  it('lets an account key mint a key with a subset of its own scopes', () => {
    const guard = new ProjectApiKeyMintGuard(noScopes);
    const user = { isApiKey: true, keyType: 'account', keyPermissions: ['projects:read', 'projects:write'] };
    expect(guard.canActivate(makeContext(user, { permissions: ['projects:read'] }))).toBe(true);
  });

  it('refuses an account key minting a key with a scope it does not have', () => {
    const guard = new ProjectApiKeyMintGuard(noScopes);
    const user = { isApiKey: true, keyType: 'account', keyPermissions: ['projects:read'] };
    expect(() => guard.canActivate(makeContext(user, { permissions: ['projects:write'] })))
      .toThrow(ForbiddenException);
  });

  it('refuses an account key minting a key with no scope restriction', () => {
    const guard = new ProjectApiKeyMintGuard(noScopes);
    const user = { isApiKey: true, keyType: 'account', keyPermissions: ['projects:read'] };
    expect(() => guard.canActivate(makeContext(user, { permissions: [] })))
      .toThrow(ForbiddenException);
  });

  it('lets a person mint a key with no scope restriction', () => {
    const guard = new ProjectApiKeyMintGuard(noScopes);
    expect(guard.canActivate(makeContext({ userId: 'someone' }, { permissions: [] }))).toBe(true);
  });
});
