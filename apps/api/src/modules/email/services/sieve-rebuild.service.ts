import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { StalwartSieveService } from '@/modules/email/stalwart/stalwart-sieve.service';

/**
 * Builds and syncs the Sieve routing script for a mailbox.
 * Called whenever aliases or catch-all rules change.
 */
@Injectable()
export class SieveRebuildService {
  private readonly logger = new Logger(SieveRebuildService.name);

  constructor(
    private prisma: PrismaService,
    private stalwartSieve: StalwartSieveService,
  ) {}

  async rebuild(stalwartAccountId: string, mailboxId: string): Promise<void> {
    const mailbox = await this.prisma.emailMailbox.findUnique({
      where: { id: mailboxId },
      include: { domain: { include: { aliases: true, catchAllRules: true } } },
    });
    if (!mailbox) return;

    const lines: string[] = ['require ["fileinto", "redirect", "envelope"];'];

    const activeAliases = mailbox.domain.aliases.filter(
      a => a.isActive && a.localPart !== mailbox.localPart,
    );
    for (const alias of activeAliases) {
      const targets = alias.targets as Array<{ type: string; address?: string }>;
      for (const target of targets.filter(t => t.type === 'mailbox' || t.type === 'external')) {
        if (target.address) {
          lines.push(`# Alias: ${alias.localPart}@${mailbox.domain.domain}`);
          lines.push(`redirect "${target.address}";`);
        }
      }
    }

    const catchAll = await this.prisma.catchAllRule.findUnique({
      where: { domainId: mailbox.domain.id },
    });
    if (catchAll?.isActive) {
      const target = catchAll.target as { type: string; address?: string };
      if (target.type === 'external' && target.address) {
        lines.push('# Catch-all');
        lines.push(`redirect "${target.address}";`);
      }
    }

    await this.stalwartSieve.setSieveScript(stalwartAccountId, lines.join('\n'), 'active');
  }
}
