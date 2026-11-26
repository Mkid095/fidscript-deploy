import { Injectable } from '@nestjs/common';
import type { Project } from '@prisma/client';
import { PrismaService } from '@/prisma/prisma.service';
import { CryptoService } from '@/modules/crypto/crypto.service';
import { InstantClientService } from '@/modules/instant/services/instant-client.service';
import { ProjectHealthChecker, ServiceHealth, unknownHealth, withTimeout } from '../types';

/**
 * The project's Instant application, against the Instant server's own
 * answer: does the app still exist under the credentials we hold?
 *
 * There was no reachability check anywhere before this — the app row and
 * the server could silently disagree.
 */
@Injectable()
export class InstantDbHealthChecker implements ProjectHealthChecker {
  readonly service = 'instantdb' as const;
  readonly link = '/backend';

  constructor(
    private prisma: PrismaService,
    private instant: InstantClientService,
    private crypto: CryptoService,
  ) {}

  async check(project: Project): Promise<ServiceHealth> {
    const app = await this.prisma.projectInstantApp.findFirst({
      where: { projectId: project.id },
    });
    if (!app) {
      return this.base('not_configured', 'The project has no Instant application.');
    }

    let token: string;
    try {
      token = this.crypto.decrypt(app.adminTokenEnc);
    } catch {
      // The stored token will not decrypt: the encryption key the row was
      // written under is not the live one. That is a real failure, but not
      // a server failure — say what is actually wrong.
      return this.base('unhealthy', 'The stored application credentials can no longer be read.');
    }

    let found: boolean;
    try {
      const result = await withTimeout(
        this.instant.getApp(app.appId, token),
        4000,
        'instant reachability',
      );
      found = result !== null;
    } catch {
      // The server did not answer in time: unknown, not down.
      return unknownHealth(this, 'The Instant server did not answer in time.');
    }
    if (!found) {
      return this.base('unhealthy', 'The Instant application no longer exists on the server.', {
        lastGoodAt: app.updatedAt,
        lastFailureAt: new Date(),
      });
    }
    return this.base('healthy', undefined, { lastGoodAt: app.updatedAt });
  }

  private base(
    state: ServiceHealth['state'],
    reason?: string,
    times?: { lastGoodAt?: Date | null; lastFailureAt?: Date | null },
  ): ServiceHealth {
    return {
      service: this.service,
      configured: state !== 'not_configured',
      state,
      reason,
      lastGoodAt: times?.lastGoodAt ? times.lastGoodAt.toISOString() : null,
      lastFailureAt: times?.lastFailureAt ? times.lastFailureAt.toISOString() : null,
      link: this.link,
    };
  }
}
