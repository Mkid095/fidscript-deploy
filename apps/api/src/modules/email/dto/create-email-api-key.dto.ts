import { IsString, IsArray, IsOptional, IsNumber } from 'class-validator';

export class CreateEmailApiKeyDto {
  /** Human-readable name, e.g. "Production", "Staging" */
  @IsString()
  name!: string;

  /** Scopes controlling what this key can do. Defaults to ["email.send"]. */
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  scopes?: string[];

  /** Daily sending limit (default 1000) */
  @IsOptional()
  @IsNumber()
  dailyLimit?: number;

  /** Monthly sending limit (default 30000) */
  @IsOptional()
  @IsNumber()
  monthlyLimit?: number;
}
