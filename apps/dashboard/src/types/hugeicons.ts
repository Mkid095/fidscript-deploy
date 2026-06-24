// Bridge between @hugeicons/core-free-icons (IconSvgObject) and
// @hugeicons/react (IconSvgElement). Both are identical at runtime;
// TypeScript just sees them as different names.
// Re-export icons cast to IconSvgElement so HugeiconsIcon accepts them.
import type { IconSvgElement } from '@hugeicons/react';

export type { IconSvgElement };
