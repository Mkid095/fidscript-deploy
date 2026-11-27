import {
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { Test } from '@nestjs/testing';

import {
  InstantProvisioningService,
} from './instant-provisioning.service';

/**
 * Linking a project's data plane at an app that already exists — the
 * operator's own Instant session, verified with its admin token before it
 * is stored.
 *
 * What is checked here: a token that the dashboard does not accept for that
 * app is never stored; an app that is gone is a clean "not found"; and the
 * operator's own env vars are the source of truth for "which app do they
 * actually use."
 */
describe('InstantProvisioningService (link + operator env)', () => {
  let service: InstantProvisioningService;
  let prisma: any;
  let crypto: any;
  let client: any;
  let eventService: any;

  const projectId = 'project-1';
  const appId = '487be5c5-7615-4bbd-b3b7-3aa97154ca99';
  const adminToken = 'the-apps-admin-token';

  beforeEach(async () => {
    prisma = {
      project: { findUnique: jest.fn(async () => ({ id: projectId, name: 'soostori' })) },
      projectInstantApp: {
        findUnique: jest.fn(async () => null),
        upsert: jest.fn(async (args: any) => ({
          appId: appId,
          title: args.create.title,
          status: 'ACTIVE',
          createdAt: new Date(),
        })),
        create: jest.fn(async () => ({})),
        delete: jest.fn(async () => ({})),
      },
      projectEnv: { findMany: jest.fn(async () => []) },
    };
    crypto = {
      encrypt: jest.fn((v: string) => `enc:${v}`),
      decrypt: jest.fn((v: string) => v.replace(/^enc:/, '')),
    };
    client = {
      isConfigured: jest.fn(() => true),
      getApp: jest.fn(async () => ({ id: appId, title: 'SOOSTORI' })),
      createApp: jest.fn(async () => ({ id: appId, title: 'SOOSTORI' })),
      deleteApp: jest.fn(async () => {}),
    };
    eventService = { emit: jest.fn() };

    const moduleRef = await Test.createTestingModule({
      providers: [
        InstantProvisioningService,
        {
          provide: require('@/prisma/prisma.service').PrismaService,
          useValue: prisma,
        },
        {
          provide: require('@/modules/crypto/crypto.service').CryptoService,
          useValue: crypto,
        },
        {
          provide: require('./instant-client.service').InstantClientService,
          useValue: client,
        },
        {
          provide: require('@/modules/events/event.service').EventService,
          useValue: eventService,
        },
      ],
    }).compile();

    service = moduleRef.get(InstantProvisioningService);
  });

  describe('link()', () => {
    it('stores the verified app and its encrypted token', async () => {
      const res = await service.link(projectId, 'actor', appId, adminToken);
      expect(res.appId).toBe(appId);
      expect(res.title).toBe('SOOSTORI');
      expect(prisma.projectInstantApp.upsert).toHaveBeenCalled();
      const upsert = prisma.projectInstantApp.upsert.mock.calls[0][0];
      expect(upsert.update.adminTokenEnc).toBe('enc:' + adminToken);
      expect(upsert.create.appId).toBe(appId);
    });

    it('rejects a token the dashboard does not accept for that app', async () => {
      client.getApp.mockRejectedValueOnce(new Error('record-not-found: instant-user'));
      await expect(service.link(projectId, 'actor', appId, adminToken)).rejects.toBeInstanceOf(
        ConflictException,
      );
      expect(prisma.projectInstantApp.upsert).not.toHaveBeenCalled();
    });

    it('reports a missing app as not found', async () => {
      client.getApp.mockResolvedValueOnce(null);
      await expect(service.link(projectId, 'actor', appId, adminToken)).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });

    it('needs both the app id and its token', async () => {
      await expect(service.link(projectId, 'actor', appId, '')).rejects.toBeInstanceOf(
        ConflictException,
      );
    });
  });

  describe('operatorInstantApp()', () => {
    it('reads the operator\'s own session from the project env vars', async () => {
      prisma.projectEnv.findMany.mockResolvedValue([
        { key: 'INSTANT_APP_ID', value: 'enc:' + appId },
        { key: 'INSTANT_ADMIN_TOKEN', value: 'enc:' + adminToken },
      ]);
      const res = await service.operatorInstantApp(projectId);
      expect(res).toEqual({ appId, adminToken });
    });

    it('is null when the operator has not brought an app', async () => {
      prisma.projectEnv.findMany.mockResolvedValue([]);
      expect(await service.operatorInstantApp(projectId)).toBeNull();
    });

    it('reads back a value that will not decrypt, as the deploy flow does', async () => {
      crypto.decrypt.mockImplementationOnce(() => {
        throw new Error('not ciphertext');
      });
      prisma.projectEnv.findMany.mockResolvedValue([
        { key: 'INSTANT_APP_ID', value: 'raw-app-id' },
      ]);
      const res = await service.operatorInstantApp(projectId);
      expect(res).toEqual({ appId: 'raw-app-id', adminToken: null });
    });
  });
});
