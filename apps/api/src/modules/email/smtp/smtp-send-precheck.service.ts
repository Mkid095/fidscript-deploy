/**
 * SMTP send pre-checks — sender-identity resolution, suppression lookup,
 * and project existence check. Extracted from SmtpSendService to keep
 * that orchestration file under the 150-line ANPAS limit.
 */
import { Injectable } from '@nestjs/common';
import { NotFoundException } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';

@Injectable()
export class SmtpSendPrecheckService {
  constructor(private prisma: PrismaService) {}

  /** Throws if the project doesn't exist. */
  async assertProjectExists(projectId: string): Promise<void> {
    const project = await this.prisma.project.findUnique({ where: { id: projectId } });
    if (!project) throw new NotFoundException('Project not found');
  }

  /**
   * Resolve the sender identity (and its domain's status) for the From
   * address. Returns null if no identity matches — in that case the
   * domain-active and reputation checks are skipped.
   */
  async resolveSenderIdentity(from?: string): Promise<{
    senderIdentityId: string;
    senderDomainId: string;
    senderDomainStatus: string;
  } | null> {
    if (!from) return null;
    const identity = await this.prisma.senderIdentity.findFirst({
      where: { email: from },
      include: { domain: { select: { id: true, status: true } } },
    });
    if (!identity) return null;
    return {
      senderIdentityId: identity.id,
      senderDomainId: identity.domain.id,
      senderDomainStatus: identity.domain.status,
    };
  }

  /**
   * Look up whether the recipient is suppressed for the given From domain.
   * Returns the suppression row (with reason) or null.
   */
  async findSuppressionForRecipient(fromDomain: string, recipient: string) {
    return this.prisma.emailSuppression.findFirst({
      where: { domain: { domain: fromDomain }, email: recipient.toLowerCase() },
    });
  }

  /** Helper: extract domain from a bare email address. */
  static extractDomain(from?: string): string {
    return from?.split('@')[1] ?? 'unknown';
  }
}
