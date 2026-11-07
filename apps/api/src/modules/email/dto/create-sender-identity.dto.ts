import { IsString, IsOptional, IsEmail } from 'class-validator';

export class CreateSenderIdentityDto {
  /** Domain this identity belongs to */
  @IsString()
  domain!: string;

  /** Full email address, e.g. "noreply@example.com". No mailbox required. */
  @IsEmail()
  email!: string;

  /** Local part (extracted if email is provided). */
  @IsOptional()
  @IsString()
  localPart?: string;

  /** Display name, e.g. "FIDScript Notifications" */
  @IsOptional()
  @IsString()
  name?: string;
}
