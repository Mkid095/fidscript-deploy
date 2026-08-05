import type { Doc } from './docs-hooks';

interface Props {
  doc: Doc;
}

export function DocsContent({ doc }: Props) {
  return (
    <div
      className="docs-content"
      dangerouslySetInnerHTML={{ __html: doc.contentHtml }}
    />
  );
}
