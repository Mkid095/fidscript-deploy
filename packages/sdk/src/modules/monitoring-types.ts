export interface Metric {
  id: string;
  metric: string;
  value: number;
  labels?: Record<string, string>;
  timestamp: string;
}

export interface AlertRule {
  id: string;
  name: string;
  metric: string;
  condition: string;
  threshold: number;
  durationSeconds: number;
  severity: string;
  channels: string[];
  enabled: boolean;
}

export interface Alert {
  id: string;
  ruleId: string;
  severity: string;
  status: 'pending' | 'firing' | 'acknowledged' | 'resolved';
  message: string;
  firstTriggeredAt?: string;
  firedAt?: string;
  acknowledgedAt?: string;
  resolvedAt?: string;
}

export interface NotificationChannel {
  id: string;
  name: string;
  type: 'email' | 'webhook' | 'slack';
  config: Record<string, string>;
}

export interface AlertEvaluation {
  id: string;
  ruleId: string;
  timestamp: string;
  value: number;
  fired: boolean;
  message?: string;
}
