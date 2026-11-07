export class CreateConversationDto {
  type?: string;
  model?: string;
  metadata?: Record<string, any>;
}

export class SendMessageDto {
  content!: string;
  role?: string;
  model?: string;
  stream?: boolean;
}

export class DiagnoseErrorDto {
  error!: string;
  context?: Record<string, any>;
}

export class GetRecommendationsDto {
  resourceType?: string;
  currentSetup?: Record<string, any>;
}

export class AssistDeploymentDto {
  projectId?: string;
  deploymentId?: string;
  action?: string;
}

export class GenerateProjectDto {
  description!: string;
  requirements?: string[];
  templateId?: string;
}