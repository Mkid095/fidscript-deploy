import { IsArray, ValidateNested, IsOptional, IsBoolean, IsString, IsIn } from 'class-validator';
import { Type } from 'class-transformer';

export class UpdateAliasTargetDto {
  @IsIn(['mailbox', 'external'])
  type!: 'mailbox' | 'external';

  @IsOptional()
  @IsString()
  mailboxId?: string;

  @IsOptional()
  @IsString()
  address?: string;
}

export class UpdateAliasDto {
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => UpdateAliasTargetDto)
  targets?: UpdateAliasTargetDto[];

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsString()
  description?: string;
}
