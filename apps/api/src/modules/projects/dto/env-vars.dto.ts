import { IsString, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class EnvVarItem {
  @ApiProperty()
  @IsString()
  key: string;

  @ApiProperty()
  @IsString()
  value: string;
}

export class UpdateEnvVarsDto {
  @ApiProperty({ type: [EnvVarItem] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => EnvVarItem)
  envVars: EnvVarItem[];
}
