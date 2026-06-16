export class CreateTemplateDto {
  name!: string;
  description?: string;
  category!: string;
  content!: string;
  variables?: TemplateVariable[];
  isPublic?: boolean;
}

export class UpdateTemplateDto {
  name?: string;
  description?: string;
  content?: string;
  variables?: TemplateVariable[];
  isPublic?: boolean;
}

export class GenerateProjectDto {
  templateId!: string;
  name!: string;
  variables!: Record<string, string>;
}

export class TemplateVariable {
  name!: string;
  description?: string;
  defaultValue?: string;
  required?: boolean;
}