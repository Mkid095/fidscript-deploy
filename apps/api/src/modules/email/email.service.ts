import { Injectable } from '@nestjs/common';

// Re-exports for backwards-compatibility during migration.
// New code should import from the specific service files directly.
export { EmailDomainService } from './domain.service';
export { EmailMailboxService } from './mailbox.service';
export { EmailAliasService } from './alias.service';
export { EmailSenderIdentityService } from './sender-identity.service';
export { EmailApiKeyService } from './api-key.service';
export { EmailMessageService } from './message.service';
export { EmailInboundService } from './inbound.service';

@Injectable()
export class EmailService {
  // Migration complete: all logic moved to focused services.
  // This class remains as a backwards-compatible re-export to avoid
  // breaking any existing injection sites during the transition.
  // Remove once all consumers import specific services directly.
}
