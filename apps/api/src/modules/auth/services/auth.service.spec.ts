import { AuthService } from './auth.service';

// `otplib` cannot be loaded by Jest. The auth service only needs the MFA
// service to exist, not to run.
jest.mock('@/modules/auth/mfa/mfa.service', () => ({
  MfaService: class {},
}));

/**
 * The sign-in method lookup must not say who has an account.
 *
 * It used to answer with the account's own stored preference, and 404 for
 * an address with no account — which is an oracle: anyone could ask the
 * platform whether a given address was registered. The answer now depends
 * on the platform alone, so the question reveals nothing.
 */
function makeService(platformAuthMethod: string | null) {
  const prisma = {
    installationSettings: {
      findFirst: jest.fn(async () => (platformAuthMethod ? { authMethod: platformAuthMethod } : null)),
    },
  };
  const service = new AuthService(
    prisma as any,
    null as any, null as any, null as any, null as any, null as any, null as any,
    null as any, null as any, null as any, null as any, null as any, null as any, null as any,
  );
  return { service, prisma };
}

describe('the sign-in method lookup', () => {
  it('answers the same for an address that has an account and one that does not', async () => {
    const { service } = makeService('MAGIC_CODE');
    const known = await service.lookupAuthMethod('someone@fidscript.com');
    const unknown = await service.lookupAuthMethod('nobody@fidscript.com');
    expect(known).toEqual(unknown);
  });

  it('never asks whether the account exists', async () => {
    const { service } = makeService('MAGIC_CODE');
    await service.lookupAuthMethod('someone@fidscript.com');
    // The lookup touches the platform's settings and nothing else — there is
    // no query about the person.
    expect(Object.keys((service as any).prisma)).toEqual(['installationSettings']);
  });

  it('answers with the platform\'s method', async () => {
    const { service } = makeService('MAGIC_CODE');
    expect(await service.lookupAuthMethod('someone@fidscript.com')).toEqual({ authMethod: 'MAGIC_CODE' });
  });

  it('answers with the default when the platform is not configured yet', async () => {
    const { service } = makeService(null);
    expect(await service.lookupAuthMethod('someone@fidscript.com')).toEqual({ authMethod: 'PASSWORD' });
  });
});
