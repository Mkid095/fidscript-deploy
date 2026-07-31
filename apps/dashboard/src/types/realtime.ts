// Realtime types

export interface RealtimeTableInfo {
  schema: string;
  table: string;
  subscribers: number;
}

export interface RealtimeSubscriber {
  table: string;
  schema: string;
  id: string;
  columns?: string[];
}

export interface RealtimeEvent<T = Record<string, unknown>> {
  eventType: 'INSERT' | 'UPDATE' | 'DELETE';
  table: string;
  schema: string;
  old: Partial<T>;
  new: Partial<T>;
  timestamp: string;
}

export interface DataResult<T> {
  data: T[];
  count: number;
}

export interface LiveQueryResult<T> {
  data: T[];
  initial: boolean;
}
