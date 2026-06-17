import { Module } from '@nestjs/common';
import { AIController } from './ai.controller';
import { AIService } from './ai.service';
import { GeminiProvider } from './providers/gemini.provider';
import { AI_PROVIDER } from './providers/ai-provider.interface';

@Module({
  controllers: [AIController],
  providers: [
    AIService,
    GeminiProvider,
    {
      provide: AI_PROVIDER,
      useExisting: GeminiProvider,
    },
  ],
  exports: [AIService],
})
export class AIModule {}