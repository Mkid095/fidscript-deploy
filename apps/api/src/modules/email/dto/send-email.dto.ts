import { IsEmail, IsOptional, IsString, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class EmailAttachmentDto {
  @IsString()
  filename!: string;

  @IsString()
  content!: string;

  @IsOptional()
  @IsString()
  contentType?: string;
}

export class SendEmailDto {
  /** Sender address. Must be a verified sender identity or mailbox. */
  @IsOptional()
  @IsEmail()
  from?: string;

  /** SMTP password (if auth required — normally not needed with API keys) */
  @IsOptional()
  @IsString()
  smtpPassword?: string;

  /** API key ID (from email.apiKeys) for rate limit tracking */
  @IsOptional()
  @IsString()
  apiKeyId?: string;

  /** Recipient address */
  @IsEmail()
  to!: string;

  /** Subject line */
  @IsString()
  subject!: string;

  /** Plain-text body */
  @IsOptional()
  @IsString()
  text?: string;

  /** HTML body */
  @IsOptional()
  @IsString()
  html?: string;

  /** Reply-To address */
  @IsOptional()
  @IsEmail()
  replyTo?: string;

  /** Attachments */
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => EmailAttachmentDto)
  attachments?: EmailAttachmentDto[];
}
