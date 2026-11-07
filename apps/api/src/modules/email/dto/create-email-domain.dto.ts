import { IsString } from 'class-validator';

export class CreateEmailDomainDto {
  @IsString()
  /** Domain name, e.g. "example.com" or "mail.example.com" */
  domain!: string;
}
