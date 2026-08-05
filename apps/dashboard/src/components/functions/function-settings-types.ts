import type { Function_ } from '@/types';

export interface FunctionSettingsProps {
  fn: Function_;
  onUpdate: (data: Partial<Function_>) => Promise<void>;
  onDelete: () => void;
}

export const RUNTIME_LABELS: Record<string, string> = {
  node: 'Node.js', python: 'Python', go: 'Go', rust: 'Rust',
};
