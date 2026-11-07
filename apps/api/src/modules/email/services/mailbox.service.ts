/**
 * Mailbox service — facade.
 *
 * Split into:
 *   - MailboxCrudService — create / list / get / update / delete / suspend / activate / password-reset
 *   - MailboxAccessService — member management + permission checks
 *
 * Existing controllers depend on this facade for backward compatibility.
 */
import { Injectable } from '@nestjs/common';
import { MailboxCrudService } from './mailbox-crud.service';
import { MailboxAccessService } from './mailbox-access.service';
import { MailboxPermission } from './mailbox-access.service';

@Injectable()
export class EmailMailboxService {
  constructor(
    private readonly crud: MailboxCrudService,
    private readonly access: MailboxAccessService,
  ) {}

  // ── CRUD ─────────────────────────────────────────────────────────────
  createMailbox = (projectId: string, dto: Parameters<MailboxCrudService['createMailbox']>[1], ownerUserId?: string) =>
    this.crud.createMailbox(projectId, dto, ownerUserId);

  updateMailbox = (projectId: string, mailboxId: string, dto: Parameters<MailboxCrudService['updateMailbox']>[2]) =>
    this.crud.updateMailbox(projectId, mailboxId, dto);

  resetMailboxPassword = (
    projectId: string,
    mailboxId: string,
    dto: Parameters<MailboxCrudService['resetMailboxPassword']>[2],
  ) => this.crud.resetMailboxPassword(projectId, mailboxId, dto);

  deleteMailbox = (projectId: string, mailboxId: string) => this.crud.deleteMailbox(projectId, mailboxId);
  suspendMailbox = (projectId: string, mailboxId: string) => this.crud.suspendMailbox(projectId, mailboxId);
  activateMailbox = (projectId: string, mailboxId: string) => this.crud.activateMailbox(projectId, mailboxId);

  getMailbox = (projectId: string, mailboxId: string) => this.crud.getMailbox(projectId, mailboxId);
  listMailboxes = (projectId: string, domainId?: string) => this.crud.listMailboxes(projectId, domainId);

  // ── Member Management ────────────────────────────────────────────────
  addMember = (mailboxId: string, projectId: string, dto: Parameters<MailboxAccessService['addMember']>[2]) =>
    this.access.addMember(mailboxId, projectId, dto);

  listMembers = (mailboxId: string, projectId: string) => this.access.listMembers(mailboxId, projectId);
  updateMember = (mailboxId: string, projectId: string, memberId: string, dto: Parameters<MailboxAccessService['updateMember']>[3]) =>
    this.access.updateMember(mailboxId, projectId, memberId, dto);
  removeMember = (mailboxId: string, projectId: string, memberId: string) =>
    this.access.removeMember(mailboxId, projectId, memberId);

  hasPermission = (
    mailboxId: string,
    userId: string | undefined,
    apiKeyId: string | undefined,
    permission: MailboxPermission,
  ) => this.access.hasPermission(mailboxId, userId, apiKeyId, permission);
}

// Re-export so existing import paths keep working.
export { MAILBOX_PERMISSIONS, ROLE_DEFAULTS, MailboxPermission } from './mailbox-access.service';
