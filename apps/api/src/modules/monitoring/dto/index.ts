export class CreateAlertRuleDto {
  name!: string;
  metric!: string;
  condition!: 'above' | 'below' | 'equals';
  threshold!: number;
  durationSeconds?: number;
  severity?: 'critical' | 'warning' | 'info';
  channels?: string[];
  enabled?: boolean;
}

export class UpdateAlertRuleDto {
  name?: string;
  metric?: string;
  condition?: 'above' | 'below' | 'equals';
  threshold?: number;
  durationSeconds?: number;
  severity?: 'critical' | 'warning' | 'info';
  channels?: string[];
  enabled?: boolean;
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
  name!: string;
  type!: 'email' | 'slack' | 'webhook' | 'pagerduty';
  config!: Record<string, string>;
}

export class UpdateNotificationChannelDto {
  name?: string;
  config?: Record<string, string>;
}