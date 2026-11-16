import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';

/**
 * The project's ONE deployment identity.
 *
 * Vercel's invariant, made a rule of the data: a project has exactly one
 * deployment identity; its deployments are versions underneath it. The
 * identity is created the first time a deployment record is created — not
 * when the build succeeds — so a failed first attempt never locks the
 * project: the next attempt is just another version of the same identity,
 * and nothing anywhere says "already initialized, refuse to build".
 *
 * Two initializations racing is the only way a second identity could get
 * written: the unique `project_id` column turns the race into a P2002 on
 * the loser, which re-reads the winner's row and links to it. The loser
 * is never a second identity — it is the same one, read again.
 */
@Injectable()
export class DeploymentIdentityService {
  private readonly logger = new Logger(DeploymentIdentityService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * The project's identity, created on first use. The given release is
   * linked to it: the first release links as the initial one; every
   * later one is a version underneath the same identity.
   */
  async establish(projectId: string, releaseId: string) {
    let identity = await this.prisma.deploymentIdentity.findUnique({
      where: { projectId },
    });

    if (!identity) {
      try {
        identity = await this.prisma.deploymentIdentity.create({
          data: { projectId, initialReleaseId: releaseId, initializedAt: new Date() },
        });
        this.logger.log(
          `[identity] project ${projectId} initialized with release ${releaseId}`,
        );
      } catch (err) {
        // The race: another initialization wrote the row between the read
        // and the write. The unique column decided; this one is the loser,
        // and the winner's row is now the project's identity.
        if ((err as { code?: string }).code === 'P2002') {
          identity = await this.prisma.deploymentIdentity.findUnique({
            where: { projectId },
          });
          if (!identity) throw err;
          this.logger.log(
            `[identity] project ${projectId} — a concurrent initialization won the race; using its identity`,
          );
        } else {
          throw err;
        }
      }
    } else if (!identity.initialReleaseId) {
      // A row without an initial release (an identity that predates the
      // backfill, or one whose initial release was cleaned away): this
      // release becomes the record of where it started.
      await this.prisma.deploymentIdentity.update({
        where: { id: identity.id },
        data: { initialReleaseId: releaseId },
      });
    }

    // Every version lives under the identity it belongs to — the history
    // and the rollback are the identity's, not a per-deployment thing.
    await this.prisma.release.update({
      where: { id: releaseId },
      data: { deploymentIdentityId: identity.id },
    });

    return identity;
  }

  /**
   * Whether the project has an identity at all — the UI's
   * "uninitialized → initialize" / "initialized → new version" split.
   */
  async exists(projectId: string): Promise<boolean> {
    const identity = await this.prisma.deploymentIdentity.findUnique({
      where: { projectId },
      select: { id: true },
    });
    return !!identity;
  }
}
