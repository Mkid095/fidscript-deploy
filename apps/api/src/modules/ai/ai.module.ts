import { Module, forwardRef } from '@nestjs/common';
import { AIController } from '@/modules/ai/controllers/ai.controller';
import { AIConversationService } from '@/modules/ai/services/ai-conversation.service';
import { AIChatHandlerService } from '@/modules/ai/services/ai-chat-handler.service';
import { AIAssistantService } from '@/modules/ai/services/ai-assistant.service';
import { GeminiProvider } from '@/modules/ai/providers/gemini.provider';
import { AI_PROVIDER } from '@/modules/ai/providers/ai-provider.interface';
import { AuthModule } from '@/modules/auth/auth.module';

@Module({
  imports: [forwardRef(() => AuthModule)],
  controllers: [AIController],
  providers: [
    AIConversationService,
    AIChatHandlerService,
    AIAssistantService,
    GeminiProvider,
    { provide: AI_PROVIDER, useExisting: GeminiProvider },
  ],
  exports: [AIConversationService, AIAssistantService],
})
export class AIModule {}
