import { existsSync, readFileSync } from 'fs';
import { join } from 'path';

interface ProjectContextFile {
  projectId?: string;
  id?: string;
}

/** Resolve the nearest repository-local FIDScript project context. */
export function loadLocalProjectId(startDirectory = process.cwd()): string | undefined {
  let directory = startDirectory;
  while (true) {
    const contextPath = join(directory, '.fidscript', 'project.json');
    if (existsSync(contextPath)) {
      try {
        const context = JSON.parse(readFileSync(contextPath, 'utf8')) as ProjectContextFile;
        return context.projectId ?? context.id;
      } catch {
        return undefined;
      }
    }
    const parent = join(directory, '..');
    if (parent === directory) return undefined;
    directory = parent;
  }
}
