export class SendEmailDto {
  to!: string;
  from?: string;
  subject!: string;
  text?: string;
  html?: string;
  replyTo?: string;
  attachments?: Array<{
    filename: string;
    content: Buffer | string;
    contentType?: string;
  }>;
}

export class CreateMailboxDto {
  email!: string;
  name?: string;
  quota?: number;
}

export class CreateAliasDto {
  alias!: string;
  forwardsTo!: string[];
  description?: string;
}

export class VerifyDomainDto {
  domain!: string;
}

export class GetEmailsDto {
  mailboxId?: string;
  limit?: number;
  offset?: number;
  unread?: boolean;
}