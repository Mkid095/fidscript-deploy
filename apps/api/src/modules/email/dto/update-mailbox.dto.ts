import { IsString, IsOptional, IsNumber, IsBoolean } from 'class-validator';

export class UpdateMailboxDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsNumber()
  quotaMb?: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
