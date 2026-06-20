import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { HugeiconsIcon } from '@hugeicons/react';

import { DOCS, getDoc } from '@/content/docs';
import { CopyPage } from '@/components/docs/copy-page';

export const metadata: Metadata = {
  title: 'FIDScript Docs',
  description: 'Self-host FIDScript on your VPS — installation, deployment, and service reference.',
};

export function generateStaticParams() {
  return DOCS.map((d) => ({ slug: d.slug }));
}

export default async function DocPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const doc = getDoc(slug);
  if (!doc) notFound();
  const { Content, title, icon } = doc;

  return (
    <article className="max-w-3xl">
      <header className="mb-6 flex items-start justify-between gap-4 border-b border-slate-900 pb-5">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-lg border border-fire-500/20 bg-fire-500/10 text-fire-500">
            <HugeiconsIcon icon={icon} size={20} color="currentColor" />
          </span>
          <h1 className="text-2xl font-bold tracking-tight text-white">{title}</h1>
        </div>
        <CopyPage />
      </header>

      <div data-doc-content className="prose-invert max-w-none text-slate-300">
        <Content />
      </div>
    </article>
  );
}
