import { IsString, IsOptional, IsNumber } from 'class-validator';

export class CreateMailboxDto {
  /** Domain name this mailbox belongs to, e.g. "example.com" */
  @IsString()
  domain!: string;

  /** Local part of the address, e.g. "john" (becomes john@example.com) */
  @IsString()
  localPart!: string;

  /** Plain-text password — shown only once, never stored in plaintext */
  @IsString()
  password!: string;

  /** Display name */
  @IsOptional()
  @IsString()
  name?: string;

  /** Quota in MB (default 1024) */
  @IsOptional()
  @IsNumber()
  quotaMb?: number;
}
