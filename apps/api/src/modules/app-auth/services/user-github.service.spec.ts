import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';

import { UserGithubService } from './user-github.service';
import { GithubApiService } from './github-api.service';
import { GithubConnectionStore } from './github-connection.store';
import { GithubOAuthService } from './github-oauth.service';
import { GithubOAuthExchangeService } from './github-oauth-exchange.service';
import { EventService } from '@/modules/events/event.service';

/**
 * The GitHub connection.
 *
 * Two ways in — the OAuth popup and a personal access token — and one rule
 * that matters more than either: the token is stored encrypted, and it never
 * comes back out of the API.
 */
describe('UserGithubService', () => {
  let service: UserGithubService;
  let api: { identify: jest.Mock; listRepos: jest.Mock; listBranches: jest.Mock };
  let store: { save: jest.Mock; find: jest.Mock; remove: jest.Mock; token: jest.Mock };
  let oauth: { isConfigured: jest.Mock; buildAuthorizeUrl: jest.Mock };

  beforeEach(async () => {
    api = {
      identify: jest.fn().mockResolvedValue({
        githubUserId: '12345',
        username: 'Mkid095',
        avatarUrl: 'https://avatars.example/1',
        scopes: 'repo,read:user',
      }),
      listRepos: jest.fn().mockResolvedValue({ repos: [], total: 0, hasMore: false }),
      listBranches: jest.fn().mockResolvedValue([]),
    };
    store = {
      save: jest.fn().mockResolvedValue(undefined),
      find: jest.fn().mockResolvedValue(null),
      remove: jest.fn().mockResolvedValue(undefined),
      token: jest.fn().mockResolvedValue(null),
    };
    oauth = {
      isConfigured: jest.fn().mockReturnValue(false),
      buildAuthorizeUrl: jest.fn().mockResolvedValue({ url: 'https://github.com/login/oauth/authorize' }),
    };

    const moduleRef = await Test.createTestingModule({
      providers: [
        UserGithubService,
        { provide: GithubApiService, useValue: api },
        { provide: GithubConnectionStore, useValue: store },
        { provide: GithubOAuthService, useValue: oauth },
        { provide: GithubOAuthExchangeService, useValue: { handle: jest.fn() } },
        { provide: EventService, useValue: { emit: jest.fn() } },
      ],
    }).compile();

    service = moduleRef.get(UserGithubService);
  });

  describe('connecting with a personal access token', () => {
    const TOKEN = `ghp_${'a'.repeat(36)}`;

    it('refuses something that is not a GitHub token', async () => {
      await expect(service.connectWithToken('user', 'hunter2')).rejects.toBeInstanceOf(
        BadRequestException,
      );
      expect(store.save).not.toHaveBeenCalled();
    });

    it('refuses an empty token', async () => {
      await expect(service.connectWithToken('user', '  ')).rejects.toBeInstanceOf(
        BadRequestException,
      );
    });

    it('checks the token with GitHub before storing it', async () => {
      await service.connectWithToken('user', TOKEN);
      expect(api.identify).toHaveBeenCalledWith(TOKEN);
      expect(store.save).toHaveBeenCalledTimes(1);
    });

    it('stores the connection, and says who it belongs to', async () => {
      const result = await service.connectWithToken('user', TOKEN);
      expect(result.username).toBe('Mkid095');
      expect(store.save).toHaveBeenCalledWith(
        'user',
        expect.objectContaining({ username: 'Mkid095', accessToken: TOKEN }),
      );
    });

    it('does not store a token GitHub rejected', async () => {
      api.identify.mockRejectedValueOnce(new BadRequestException('GitHub rejected that token'));
      await expect(service.connectWithToken('user', TOKEN)).rejects.toBeInstanceOf(
        BadRequestException,
      );
      expect(store.save).not.toHaveBeenCalled();
    });
  });

  describe('the OAuth app', () => {
    it('says when the deployment has none', () => {
      oauth.isConfigured.mockReturnValue(false);
      expect(service.isOAuthConfigured()).toBe(false);
    });

    it('says when it does', () => {
      oauth.isConfigured.mockReturnValue(true);
      expect(service.isOAuthConfigured()).toBe(true);
    });
  });

  describe('reading the account', () => {
    it('says the account is not connected when there is no row', async () => {
      await expect(service.getConnection('user')).resolves.toBeNull();
    });

    it('never returns the token with the connection', async () => {
      store.find.mockResolvedValueOnce({
        githubUserId: '1',
        username: 'Mkid095',
        avatarUrl: null,
        scopes: 'repo',
        tokenExpiresAt: null,
      });
      const connection = await service.getConnection('user');
      expect(connection).not.toHaveProperty('encryptedToken');
      expect(connection).not.toHaveProperty('accessToken');
      expect(connection?.username).toBe('Mkid095');
    });
  });

  describe('the repositories', () => {
    it('say the account is not connected when there is no token', async () => {
      store.token.mockResolvedValueOnce(null);
      await expect(service.listRepos('user')).rejects.toBeInstanceOf(NotFoundException);
    });

    it('are read with the stored token', async () => {
      store.token.mockResolvedValueOnce('ghp_token');
      await service.listRepos('user');
      expect(api.listRepos).toHaveBeenCalledWith('ghp_token', 1, 30);
    });
  });
});
