export type ActionType = 'http' | 'function' | 'email' | 'queue';

export type JobEditForm = {
  name: string;
  expression: string;
  timezone: string;
  actionType: ActionType;
  endpoint: string;
  functionId: string;
  emailFrom: string;
  emailTo: string;
  emailSubject: string;
  emailBody: string;
  queueId: string;
  queueBody: string;
  queueDelaySeconds: number;
  payload: string;
  retryAttempts: number;
  retryDelay: number;
  timeout: number;
};

export const TIMEZONES = [
  'UTC', 'America/New_York', 'Europe/London', 'Asia/Tokyo', 'Asia/Singapore',
];

export const EMPTY_EDIT_FORM: JobEditForm = {
  name: '',
  expression: '',
  timezone: 'UTC',
  actionType: 'http',
  endpoint: '',
  functionId: '',
  emailFrom: '',
  emailTo: '',
  emailSubject: '',
  emailBody: '',
  queueId: '',
  queueBody: '',
  queueDelaySeconds: 0,
  payload: '{}',
  retryAttempts: 3,
  retryDelay: 60,
  timeout: 300,
};