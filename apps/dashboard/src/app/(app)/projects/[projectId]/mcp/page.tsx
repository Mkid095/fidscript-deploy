'use client';

import { useProjectContext } from '@/contexts/project-context';
import { McpHub } from './mcp-hub';

export default function McpPage() {
  const { project } = useProjectContext();

  if (!project) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <p className="text-sm text-[var(--text-muted)]">Select a project to view MCP settings.</p>
      </div>
    );
  }

  return <McpHub project={project} />;
}
