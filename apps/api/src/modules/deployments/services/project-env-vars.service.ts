import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { CryptoService } from '@/modules/crypto/crypto.service';

/**
 * The environment variables a deployment carries.
 *
 * They are stored encrypted, one row per key, on the project. A variable
 * that lives only in a deployment's event is gone the moment the event has
 * been consumed — so what an operator types into the wizard is SAVED here,
 * before the build starts, and the build reads it from here.
 */
@Injectable()
export class ProjectEnvVarsService {
  constructor(
    private prisma: PrismaService,
    private crypto: CryptoService,
  ) {}

  /**
   * Save the variables, replacing the ones already stored under the same key.
   *
   * Returns how many were written. A variable with an empty name is not a
   * variable, and is skipped.
   */
  async save(projectId: string, envVars: Record<string, string>): Promise<number> {
    const entries = Object.entries(envVars ?? {}).filter(
      ([key]) => typeof key === 'string' && key.trim().length > 0,
    );
    if (!entries.length) return 0;

    for (const [key, value] of entries) {
      const encrypted = this.crypto.encrypt(String(value ?? ''));
      await this.prisma.projectEnv.upsert({
        where: { projectId_key: { projectId, key } },
        create: { projectId, key, value: encrypted },
        update: { value: encrypted },
      });
    }
    return entries.length;
  }
}
