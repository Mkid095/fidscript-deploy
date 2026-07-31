// Queue types

export interface Queue {
  id: string;
  name: string;
  type: string;
  status: string;
  createdAt: string;
}

export interface QueueMessage {
  id: string;
  body: string;
  status: string;
  attempts: number;
  createdAt: string;
}
