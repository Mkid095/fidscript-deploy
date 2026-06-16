import { Injectable, Inject } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { AIProvider, AICompletionRequest, AICompletionResponse } from './ai-provider.interface.js';

@Injectable()
export class GeminiProvider implements AIProvider {
  name = 'gemini';
  private apiKey: string;
  private baseUrl = 'https://generativelanguage.googleapis.com/v1beta';

  constructor(
    private configService: ConfigService,
  ) {
    this.apiKey = this.configService.get<string>('GEMINI_API_KEY', '');
  }

  async complete(request: AICompletionRequest): Promise<AICompletionResponse> {
    const startTime = Date.now();
    const model = request.model || 'gemini-1.5-flash';

    const contents = request.messages.map((m) => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }],
    }));

    try {
      const response = await axios.post(
        `${this.baseUrl}/models/${model}:generateContent`,
        {
          contents,
          generationConfig: {
            temperature: request.temperature ?? 0.7,
            maxOutputTokens: request.maxTokens ?? 2048,
          },
        },
        {
          params: { key: this.apiKey },
          headers: { 'Content-Type': 'application/json' },
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
      throw new Error(`Gemini API error: ${error.response?.data?.error?.message || error.message}`);
    }
  }
}