import { FunctionsCrudService } from './functions-crud.service';
import { FunctionsVarsService } from './functions-vars.service';

/**
 * A function's variables are the credentials it calls with.
 *
 * They used to be stored in plaintext and returned to every member of the
 * project, whatever their role. Now they are stored encrypted, shown only to
 * the people who administer the project, and the runtime — the one thing
 * that genuinely needs them — gets the decrypted values.
 */

/** A stand-in for the platform's real cipher: reversible, and opaque. */
const enc = (value: string) => 'enc:' + Buffer.from(value, 'utf8').toString('base64');
const dec = (value: string) => Buffer.from(value.slice(4), 'base64').toString('utf8');

const STORED = {
  OPENAI_API_KEY: enc('openai:secretvalue'),
  REGION: enc('eu-west-1'),
};

function makeService() {
  const prisma = {
    function: {
      create: jest.fn(async ({ data }: any) => ({ id: 'fn-1', ...data })),
      findMany: jest.fn(async () => [{ id: 'fn-1', name: 'fn', envVars: STORED }]),
      findFirst: jest.fn(async () => ({ id: 'fn-1', name: 'fn', envVars: STORED })),
      update: jest.fn(async ({ data }: any) => ({ id: 'fn-1', ...data })),
      delete: jest.fn(async () => ({})),
    },
  };
  const eventService = { emit: jest.fn(async () => undefined) };
  const cryptoService = {
    encrypt: jest.fn((value: string) => enc(value)),
    decrypt: jest.fn((value: string) => {
      if (!value.startsWith('enc:')) throw new Error('not ciphertext');
      return dec(value);
    }),
  };
  const vars = new FunctionsVarsService(cryptoService as any);
  const service = new FunctionsCrudService(prisma as any, eventService as any, vars);
  return { service, prisma, cryptoService };
}

describe("a function's variables", () => {
  it('are stored encrypted, never in plaintext', async () => {
    const { service, prisma } = makeService();
    await service.createFunction('p1', { name: 'fn', runtime: 'nodejs', envVars: { KEY: 'super-secret' } });
    const written = prisma.function.create.mock.calls[0][0].data.envVars;
    expect(written.KEY).not.toContain('super-secret');
    expect(written.KEY).toBe(enc('super-secret'));
  });

  it('are masked for a member who may not read them', async () => {
    const { service } = makeService();
    const [fn] = await service.listFunctions('p1', false);
    expect(fn.envVars.OPENAI_API_KEY).toBe('[masked]');
    expect(fn.envVars.REGION).toBe('[masked]');
  });

  it('are revealed to a member who may read them', async () => {
    const { service } = makeService();
    const fn = await service.getFunction('p1', 'fn-1', true);
    expect(fn.envVars.OPENAI_API_KEY).toBe('openai:secretvalue');
  });

  it('are decrypted for the runtime', async () => {
    const { service } = makeService();
    const fn = await service.getFunctionWithSecrets('p1', 'fn-1');
    expect(fn.envVars.OPENAI_API_KEY).toBe('openai:secretvalue');
  });

  it('are not overwritten by a page that saves the mask back', async () => {
    const { service, prisma } = makeService();
    await service.updateFunction('p1', 'fn-1', {
      envVars: { OPENAI_API_KEY: '[masked]', REGION: enc('eu-west-1') },
    } as any);
    const written = prisma.function.update.mock.calls[0][0].data.envVars;
    expect(written.OPENAI_API_KEY).toBe(STORED.OPENAI_API_KEY);
  });

  it('are replaced when a real value is given', async () => {
    const { service, prisma } = makeService();
    await service.updateFunction('p1', 'fn-1', {
      envVars: { OPENAI_API_KEY: 'a-new-secret' },
    } as any);
    const written = prisma.function.update.mock.calls[0][0].data.envVars;
    expect(written.OPENAI_API_KEY).toBe(enc('a-new-secret'));
  });
});
