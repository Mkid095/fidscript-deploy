export type ActionType = 'http' | 'function' | 'email' | 'queue';

export type JobForm = {
  name: string;
  expression: string;
  timezone: string;
  actionType: ActionType;
  endpoint: string;
  httpMethod: string;
  httpHeaders: { key: string; value: string }[];
  functionId: string;
  emailTo: string;
  emailSubject: string;
  emailBody: string;
  emailFrom: string;
  queueId: string;
  queueBody: string;
  queueDelaySeconds: number;
  payload: string;
  retryAttempts: number;
  retryDelay: number;
  timeout: number;
};

export const TIMEZONES = [
  'UTC', 'America/New_York', 'America/Chicago', 'America/Denver', 'America/Los_Angeles',
  'Europe/London', 'Europe/Paris', 'Asia/Tokyo', 'Asia/Singapore', 'Australia/Sydney',
];

export const HTTP_METHODS = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'] as const;

export const ACTION_OPTIONS: { value: ActionType; label: string }[] = [
  { value: 'http', label: 'HTTP Request' },
  { value: 'function', label: 'Function' },
  { value: 'email', label: 'Email' },
  { value: 'queue', label: 'Queue Job' },
];

export const EMPTY_JOB_FORM: JobForm = {
  name: '', expression: '', timezone: 'UTC',
  actionType: 'http',
  endpoint: '', httpMethod: 'POST', httpHeaders: [],
  functionId: '',
  emailFrom: '', emailTo: '', emailSubject: '', emailBody: '',
  queueId: '', queueBody: '', queueDelaySeconds: 0,
  payload: '{}',
  retryAttempts: 3, retryDelay: 60, timeout: 300,
};