export interface AICompletionRequest {
  model: string;
  messages: Array<{ role: string; content: string }>;
  temperature?: number;
  maxTokens?: number;
}

export interface AICompletionResponse {
  content: string;
  model: string;
  tokenCount: number;
  latencyMs: number;
  finishReason?: string;
}

export interface AIProvider {
  name: string;
  complete(request: AICompletionRequest): Promise<AICompletionResponse>;
  stream(request: AICompletionRequest): AsyncGenerator<string>;
}

export const AI_PROVIDER = 'AI_PROVIDER';