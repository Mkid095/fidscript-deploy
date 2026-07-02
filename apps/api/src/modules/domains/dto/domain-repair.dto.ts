import { IsBoolean, IsOptional, IsArray, IsString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateRepairPolicyDto {
  @ApiPropertyOptional({ description: 'Automatically repair missing DNS records' })
  @IsOptional()
  @IsBoolean()
  autoRepairDns?: boolean;

  @ApiPropertyOptional({ description: 'Automatically renew SSL certificates (default: true)' })
  @IsOptional()
  @IsBoolean()
  autoRepairSsl?: boolean;

  @ApiPropertyOptional({ description: 'Automatically repair email DNS records' })
  @IsOptional()
  @IsBoolean()
  autoRepairEmail?: boolean;

  @ApiPropertyOptional({ description: 'Automatically repair routing issues' })
  @IsOptional()
  @IsBoolean()
  autoRepairRouting?: boolean;

  @ApiPropertyOptional({ description: 'List of explicitly allowed repair types (empty = all allowed)' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  allowedRepairs?: string[];
}

export class TriggerRepairDto {
  @ApiPropertyOptional({ description: 'Incident ID to repair (creates repair plan from incident)' })
  @IsOptional()
  @IsString()
  incidentId?: string;

  @ApiPropertyOptional({ description: 'Repair type to execute directly (bypasses planner)' })
  @IsOptional()
  @IsString()
  repairType?: string;

  @ApiPropertyOptional({ description: 'Auto-approve and execute without waiting for approval (default: false)' })
  @IsOptional()
  @IsBoolean()
  autoApprove?: boolean;
}
