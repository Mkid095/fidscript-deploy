# Skills Service

Installable platform extensions and marketplace.

---

## Purpose

Provides a marketplace for reusable business modules that extend platform capabilities.

---

## Responsibilities

- Skill discovery and browsing
- One-click skill installation
- Version management
- Skill configuration per project
- Community skills

---

## Dependencies

- Git (skill repositories)
- Docker (skill runtime)

---

## Events Produced

| Event | Trigger |
|-------|---------|
| skill.installed | Skill installed |
| skill.uninstalled | Skill removed |
| skill.updated | Skill upgraded |

---

## API Endpoints

```
GET /api/v1/skills
  Headers: Authorization: Bearer <token>
  Query: ?category=&search=
  Response: { skills: [...] }
  Errors: 401

GET /api/v1/skills/installed
  Headers: Authorization: Bearer <token>
  Response: { installations: [...] }
  Errors: 401

POST /api/v1/projects/:projectId/skills/:skillId/install
  Headers: Authorization: Bearer <token>
  Body: { config?: object }
  Response: { installation }
  Errors: 401, 404

DELETE /api/v1/projects/:projectId/skills/:skillId
  Headers: Authorization: Bearer <token>
  Response: { success: true }
  Errors: 401, 404

GET /api/v1/projects/:projectId/skills/:skillId/config
  Headers: Authorization: Bearer <token>
  Response: { config }
  Errors: 401, 404
```

---

## SDK Methods

```typescript
interface Skill {
  id: string;
  name: string;
  slug: string;
  category: string;
  description: string;
  version: string;
  isOfficial: boolean;
  isInstalled: boolean;
}

interface SkillInstallation {
  id: string;
  skillId: string;
  projectId: string;
  config: Record<string, unknown>;
  version: string;
  status: 'active' | 'error';
}

platform.skills.list(options?: {
  category?: string;
  search?: string;
}): Promise<Skill[]>

platform.skills.getInstalled(projectId: string): Promise<SkillInstallation[]>

platform.skills.install(projectId: string, skillId: string, config?: Record<string, unknown>): Promise<SkillInstallation>

platform.skills.uninstall(projectId: string, skillId: string): Promise<void>

platform.skills.getConfig(projectId: string, skillId: string): Promise<Record<string, unknown>>
```

---

## MCP Tools

```json
{
  "name": "list_skills",
  "description": "List available skills",
  "inputSchema": {
    "type": "object",
    "properties": {
      "category": { "type": "string" },
      "search": { "type": "string" }
    }
  }
}

{
  "name": "install_skill",
  "description": "Install a skill",
  "inputSchema": {
    "type": "object",
    "properties": {
      "projectId": { "type": "string" },
      "skillId": { "type": "string" },
      "config": { "type": "object" }
    },
    "required": ["projectId", "skillId"]
  }
}

{
  "name": "uninstall_skill",
  "description": "Uninstall a skill",
  "inputSchema": {
    "type": "object",
    "properties": {
      "projectId": { "type": "string" },
      "skillId": { "type": "string" }
    },
    "required": ["projectId", "skillId"]
  }
}
```
