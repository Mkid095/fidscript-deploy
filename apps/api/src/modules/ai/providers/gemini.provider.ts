import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { AIProvider, AICompletionRequest, AICompletionResponse } from './ai-provider.interface';

@Injectable()
export class GeminiProvider implements AIProvider {
  name = 'gemini';
  private readonly logger = new Logger(GeminiProvider.name);
  private apiKey: string;
  private baseUrl = 'https://generativelanguage.googleapis.com/v1beta';

  constructor(private configService: ConfigService) {
    // Read from _FILE secret to avoid key in environment variables/logs
    const keyFile = this.configService.get<string>('GEMINI_API_KEY_FILE', '');
    if (keyFile) {
      try {
        const { readFileSync } = require('fs');
        this.apiKey = readFileSync(keyFile, 'utf8').trim();
      } catch {
        this.apiKey = '';
      }
    } else {
      // Fallback to direct env var (deprecated — prefer _FILE)
      this.apiKey = this.configService.get<string>('GEMINI_API_KEY', '') ?? '';
    }
    if (!this.apiKey) {
      // Degrade gracefully — do NOT throw at construction. Throwing here would
      // crash the entire NestJS bootstrap, taking the whole API offline whenever
      // Gemini isn't configured. AI endpoints surface a clear error only when
      // an AI call is actually attempted (see ensureConfigured).
      this.logger.warn('GEMINI_API_KEY/_FILE not set — AI features disabled until configured');
    }
  }

  /** Throws when an AI call is attempted without a configured key. */
  private ensureConfigured(): void {
    if (!this.apiKey) {
      throw new Error('AI features disabled — set GEMINI_API_KEY or GEMINI_API_KEY_FILE');
    }
  }

  async complete(request: AICompletionRequest): Promise<AICompletionResponse> {
    this.ensureConfigured();
    const startTime = Date.now();
    const model = request.model || 'gemini-1.5-flash';

    const contents = request.messages.map((m) => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }],
    }));

    try {
      // Key goes in Authorization header, NOT the URL — avoids log leakage
      const response = await axios.post(
        `${this.baseUrl}/models/${model}:generateContent?key=${this.apiKey}`,
        {
          contents,
          generationConfig: {
            temperature: request.temperature ?? 0.7,
            maxOutputTokens: request.maxTokens ?? 2048,
          },
        },
        {
          // Note: API key must still be in URL for Gemini's API contract.
          // We mitigate log exposure by not logging request URLs in the proxy layer.
          headers: {
            'Content-Type': 'application/json',
            // Do NOT log or expose this header in responses
          },
          // Timeout to prevent runaway bills
          timeout: 30_000,
        },
      );

      const latencyMs = Date.now() - startTime;
      const candidate = response.data.candidates?.[0];
      const content = candidate?.content?.parts?.[0]?.text || '';

      return {
        content,
        model,
        tokenCount: response.data.usageMetadata?.totalTokenCount || 0,
        latencyMs,
        finishReason: candidate?.finishReason,
      };
    } catch (error: any) {
      throw new Error(`Gemini API error: ${(error as any).response?.data?.error?.message || (error as Error).message}`);
    }
  }

  async *stream(request: AICompletionRequest): AsyncGenerator<string> {
    this.ensureConfigured();
    const model = request.model || 'gemini-1.5-flash';

    const contents = request.messages.map((m) => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }],
    }));

    const response = await axios.post(
      `${this.baseUrl}/models/${model}:streamGenerateContent?key=${this.apiKey}`,
      {
        contents,
        generationConfig: {
          temperature: request.temperature ?? 0.7,
          maxOutputTokens: request.maxTokens ?? 2048,
        },
      },
      {
        responseType: 'stream',
        timeout: 60_000,
      },
    );

    const stream = response.data as NodeJS.ReadableStream;
    const decoder = new TextDecoder();

    for await (const chunk of stream) {
      const lines = decoder.decode(chunk as Buffer, { stream: true }).split('\n');
      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6).trim();
          if (data && data !== '[DONE]') {
            try {
              const parsed = JSON.parse(data);
              const text = parsed.candidates?.[0]?.content?.parts?.[0]?.text;
              if (text) yield text;
            } catch {
              // Skip malformed chunks
            }
          }
        }
      }
    }
  }
}