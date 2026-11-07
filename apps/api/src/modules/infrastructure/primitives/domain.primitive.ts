import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';

/**
 * DomainPrimitive — the project's domain is the root infrastructure primitive.
 *
 * The platform's mental model: one project = one primary domain = one
 * source of truth for routing, email, deployment, real-time, etc.
 *
 * Capabilities on a domain (`Domain.capabilities` JSON) are how services
 * subscribe to it. Adding `{ email: true }` to a domain's capabilities
 * unlocks email for that domain. The email service does not own this
 * decision — the Infrastructure layer does.
 */
@Injectable()
export class DomainPrimitive {
  constructor(private prisma: PrismaService) {}

  /**
   * Get the project's primary domain.
   * Returns null if the project has no primary domain yet (pre-OAuth).
   */
  async getPrimaryDomain(projectId: string) {
    return this.prisma.domain.findFirst({
      where: { projectId, isPrimary: true },
      orderBy: { createdAt: 'asc' },
    });
  }

  /**
   * Get the apex zone (e.g. `example.com` for `api.example.com`).
   * Used to look up the right Cloudflare zone.
   */
  async getApexZone(projectId: string, domain?: string): Promise<string | null> {
    if (domain) return domain;
    const d = await this.getPrimaryDomain(projectId);
    return d?.zoneDomain ?? d?.domain ?? null;
  }

  /**
   * Update the capabilities JSON on a domain. Idempotent merge.
   * Used by the Infrastructure layer to enable/disable services
   * (e.g. after Cloudflare OAuth completes, the email service's
   * auto-onboarding can be triggered by writing `email: true` here).
   */
  async setCapability(
    domainId: string,
    capability: 'deployment' | 'email' | 'inboundEmail' | 'tracking' | 'api' | 'redirect' | 'sandbox',
    enabled: boolean,
  ): Promise<void> {
    const domain = await this.prisma.domain.findUnique({
      where: { id: domainId },
      select: { capabilities: true },
    });
    if (!domain) throw new NotFoundException(`Domain ${domainId} not found.`);
    const current = (domain.capabilities as Record<string, boolean>) ?? {};
    await this.prisma.domain.update({
      where: { id: domainId },
      data: { capabilities: { ...current, [capability]: enabled } },
    });
  }

  /**
   * Get the domain by its hostname (within a project).
   * Used for routing — which domain handles `api.example.com`?
   */
  async findByName(projectId: string, name: string) {
    return this.prisma.domain.findFirst({
      where: { projectId, domain: name },
    });
  }
}
