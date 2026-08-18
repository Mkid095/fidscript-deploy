import { Type } from 'class-transformer';
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
  @Type(() => Number)
  @IsNumber()
  limit?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  offset?: number;
}
