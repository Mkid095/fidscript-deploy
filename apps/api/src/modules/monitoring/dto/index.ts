import { IsString, IsNumber, IsInt, IsBoolean, IsArray, IsEnum, IsOptional, IsObject } from 'class-validator';

export class CreateAlertRuleDto {
  @IsString() name!: string;
  @IsString() metric!: string;
  @IsEnum(['above', 'below', 'equals']) condition!: 'above' | 'below' | 'equals';
  @IsNumber() threshold!: number;
  @IsInt() @IsOptional() durationSeconds?: number;
  @IsEnum(['critical', 'warning', 'info']) @IsOptional() severity?: 'critical' | 'warning' | 'info';
  @IsArray() @IsOptional() channels?: string[];
  @IsBoolean() @IsOptional() enabled?: boolean;
}

export class UpdateAlertRuleDto {
  @IsString() @IsOptional() name?: string;
  @IsString() @IsOptional() metric?: string;
  @IsEnum(['above', 'below', 'equals']) @IsOptional() condition?: 'above' | 'below' | 'equals';
  @IsNumber() @IsOptional() threshold?: number;
  @IsInt() @IsOptional() durationSeconds?: number;
  @IsEnum(['critical', 'warning', 'info']) @IsOptional() severity?: 'critical' | 'warning' | 'info';
  @IsArray() @IsOptional() channels?: string[];
  @IsBoolean() @IsOptional() enabled?: boolean;
}

export class GetMetricsDto {
  metric?: string;
  startTime?: Date;
  endTime?: Date;
  interval?: string;
  projectId?: string;
}

export class GetAlertsDto {
  status?: 'firing' | 'resolved' | 'pending';
  severity?: string;
}

export class CreateNotificationChannelDto {
  @IsString() name!: string;
  @IsEnum(['email', 'slack', 'webhook', 'pagerduty']) type!: 'email' | 'slack' | 'webhook' | 'pagerduty';
  @IsObject() config!: Record<string, string>;
}

export class UpdateNotificationChannelDto {
  @IsString() @IsOptional() name?: string;
  @IsObject() @IsOptional() config?: Record<string, string>;
}