# Templates Service

Project scaffolding and generation.

---

## Purpose

Provides one-click project generation from pre-built templates.

---

## Responsibilities

- Template discovery
- Project generation from template
- Template variable handling
- Custom template creation
- Official and community templates

---

## Dependencies

- Git (template repositories)

---

## API Endpoints

```
GET /api/v1/templates
  Headers: Authorization: Bearer <token>
  Query: ?category=
  Response: { templates: [...] }
  Errors: 401

GET /api/v1/templates/:id
  Headers: Authorization: Bearer <token>
  Response: { template }
  Errors: 401, 404

POST /api/v1/templates/:id/generate
  Headers: Authorization: Bearer <token>
  Body: {
    name: string,
    variables?: object
  }
  Response: { project }
  Errors: 401, 404
```

---

## SDK Methods

```typescript
interface Template {
  id: string;
  name: string;
  slug: string;
  category: string;
  description: string;
  previewImages: string[];
  variables: Array<{
    name: string;
    description: string;
    default?: string;
    required: boolean;
  }>;
  isOfficial: boolean;
}

platform.templates.list(options?: {
  category?: string;
}): Promise<Template[]>

platform.templates.get(templateId: string): Promise<Template>

platform.templates.generate(templateId: string, data: {
  name: string;
  variables?: Record<string, string>;
}): Promise<Project>
```

---

## MCP Tools

```json
{
  "name": "list_templates",
  "description": "List available templates",
  "inputSchema": {
    "type": "object",
    "properties": {
      "category": { "type": "string" }
    }
  }
}

{
  "name": "generate_from_template",
  "description": "Generate project from template",
  "inputSchema": {
    "type": "object",
    "properties": {
      "templateId": { "type": "string" },
      "name": { "type": "string" },
      "variables": { "type": "object" }
    },
    "required": ["templateId", "name"]
  }
}
```
