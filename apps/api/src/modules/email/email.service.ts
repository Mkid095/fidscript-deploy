import { Injectable } from '@nestjs/common';

// Re-exports for backwards-compatibility during migration.
// New code should import from the specific service files directly.
export { EmailDomainService } from './services/domain.service';
export { EmailMailboxService } from './services/mailbox.service';
export { EmailAliasService } from './services/alias.service';
export { EmailSenderIdentityService } from './services/sender-identity.service';
export { EmailApiKeyService } from './services/api-key.service';
export { EmailMessageService } from './services/message.service';
export { EmailInboundService } from './services/inbound.service';

@Injectable()
export class EmailService {
  // Migration complete: all logic moved to focused services.
  // This class remains as a backwards-compatible re-export to avoid
  // breaking any existing injection sites during the transition.
  // Remove once all consumers import specific services directly.
}
