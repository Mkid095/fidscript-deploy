import { IsString, IsOptional, IsBoolean, IsNumber, IsIn } from 'class-validator';

export class ListMessagesDto {
  @IsOptional()
  @IsString()
  mailboxId?: string;

  @IsOptional()
  @IsIn(['inbox', 'sent', 'drafts', 'trash', 'spam'])
  folder?: 'inbox' | 'sent' | 'drafts' | 'trash' | 'spam';

  @IsOptional()
  @IsBoolean()
  unread?: boolean;

  @IsOptional()
  @IsNumber()
  limit?: number;

  @IsOptional()
  @IsNumber()
  offset?: number;
}
