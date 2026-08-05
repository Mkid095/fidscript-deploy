'use client';

import { useParams, useRouter } from 'next/navigation';
import { useCallback } from 'react';
import { DocsSidebar } from './docs-sidebar';
import { getDoc, DOCS } from './docs-hooks';

export function DocsPage() {
  const params = useParams();
  const router = useRouter();
  const slug = typeof params.slug === 'string' ? params.slug : 'getting-started';
  const doc = getDoc(slug) ?? DOCS[0];

  const handleNavigate = useCallback((newSlug: string) => {
    router.push(`/docs/${newSlug}`);
  }, [router]);

  return (
    <div className="flex flex-1 overflow-hidden">
      <DocsSidebar currentSlug={doc.slug} onNavigate={handleNavigate} />
      <main className="flex-1 overflow-y-auto p-8">
        <div
          className="max-w-3xl mx-auto docs-content"
          dangerouslySetInnerHTML={{ __html: doc.contentHtml }}
        />
      </main>
    </div>
  );
}
