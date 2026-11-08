import {
  IsArray,
  IsBoolean,
  IsDate,
  IsEnum,
  IsInt,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateAlertRuleDto {
  @IsString() name!: string;
  @IsString() metric!: string;
  @IsEnum(['above', 'below', 'equals']) condition!:
    | 'above'
    | 'below'
    | 'equals';
  @IsNumber() threshold!: number;
  @IsInt() @IsOptional() durationSeconds?: number;
  @IsEnum(['critical', 'warning', 'info']) @IsOptional() severity?:
    | 'critical'
    | 'warning'
    | 'info';
  @IsArray() @IsOptional() channels?: string[];
  @IsBoolean() @IsOptional() enabled?: boolean;
}

export class UpdateAlertRuleDto {
  @IsString() @IsOptional() name?: string;
  @IsString() @IsOptional() metric?: string;
  @IsEnum(['above', 'below', 'equals']) @IsOptional() condition?:
    | 'above'
    | 'below'
    | 'equals';
  @IsNumber() @IsOptional() threshold?: number;
  @IsInt() @IsOptional() durationSeconds?: number;
  @IsEnum(['critical', 'warning', 'info']) @IsOptional() severity?:
    | 'critical'
    | 'warning'
    | 'info';
  @IsArray() @IsOptional() channels?: string[];
  @IsBoolean() @IsOptional() enabled?: boolean;
}

export class GetMetricsDto {
  /** The query's fields are whitelisted explicitly — the same pipe that
   *  rejected the console's log filters rejects undecorated fields here. */
  @IsString() @IsOptional() metric?: string;
  // The Type transform produces a Date before the validators run, so the
  // validator here must accept a Date (IsDateString wants a string, and its
  // rejection was refusing every query that named a range).
  @Type(() => Date) @IsDate() @IsOptional() startTime?: Date;
  @Type(() => Date) @IsDate() @IsOptional() endTime?: Date;
  @IsString() @IsOptional() interval?: string;
  @IsString() @IsOptional() projectId?: string;
}

export class GetAlertsDto {
  @IsEnum(['firing', 'resolved', 'pending']) @IsOptional() status?:
    | 'firing'
    | 'resolved'
    | 'pending';
  @IsString() @IsOptional() severity?: string;
}

export class CreateNotificationChannelDto {
  @IsString() name!: string;
  @IsEnum(['email', 'slack', 'webhook']) type!: 'email' | 'slack' | 'webhook';
  @IsObject() config!: Record<string, string>;
}

export class UpdateNotificationChannelDto {
  @IsString() @IsOptional() name?: string;
  @IsObject() @IsOptional() config?: Record<string, string>;
}
