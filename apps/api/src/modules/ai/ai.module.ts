import { Module } from '@nestjs/common';
import { AIController } from './ai.controller.js';
import { AIService } from './ai.service.js';
import { GeminiProvider } from './providers/gemini.provider.js';
import { AIProvider } from './providers/ai-provider.interface.js';

@Module({
  controllers: [AIController],
  providers: [
    AIService,
    GeminiProvider,
    {
      provide: AIProvider,
      useExisting: GeminiProvider,
    },
  ],
  exports: [AIService],
})
export class AIModule {}