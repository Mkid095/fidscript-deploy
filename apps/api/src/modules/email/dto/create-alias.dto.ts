import { IsString, IsArray, ValidateNested, IsOptional, IsIn } from 'class-validator';
import { Type } from 'class-transformer';

export class AliasTargetDto {
  @IsIn(['mailbox', 'external', 'webhook'])
  type!: 'mailbox' | 'external' | 'webhook';

  @IsOptional()
  @IsString()
  mailboxId?: string;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsString()
  url?: string;
}

export class CreateAliasDto {
  /** Domain this alias belongs to */
  @IsString()
  domain!: string;

  /** Local part, e.g. "sales" (becomes sales@example.com) */
  @IsString()
  localPart!: string;

  /** Forwarding targets, processed in order. */
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AliasTargetDto)
  targets!: AliasTargetDto[];

  @IsOptional()
  @IsString()
  description?: string;
}
