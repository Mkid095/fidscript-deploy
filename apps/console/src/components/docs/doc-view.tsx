import Link from 'next/link';

import { Card } from '@/components/ui/card';
import { CodeBlock } from '@/components/ui/code-block';
import { DOC_GROUPS, DOC_PAGES, type DocPage } from '@/content/docs';

/**
 * A page of the guide.
 *
 * The words are in one column, because a sentence that is 900 pixels wide
 * is a sentence nobody reads. The navigation is beside it, so the next
 * thing is always in sight.
 */
export function DocView({ page }: { page: DocPage }) {
  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6">
      <div className="grid grid-cols-1 gap-10 lg:grid-cols-[220px_minmax(0,1fr)]">
        <nav aria-label="The guide" className="lg:sticky lg:top-6 lg:self-start">
          {DOC_GROUPS.map((group) => {
            const pages = DOC_PAGES.filter((candidate) => candidate.group === group);
            if (pages.length === 0) return null;
            return (
              <div key={group} className="mb-5 last:mb-0">
                <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-text-dim">
                  {group}
                </p>
                <ul className="space-y-0.5">
                  {pages.map((candidate) => (
                    <li key={candidate.slug}>
                      <Link
                        href={`/docs/${candidate.slug}`}
                        aria-current={candidate.slug === page.slug ? 'page' : undefined}
                        className={`block rounded-md px-2 py-1 text-sm transition-colors ${
                          candidate.slug === page.slug
                            ? 'bg-surface-3 font-medium text-text'
                            : 'text-text-muted hover:bg-surface-2 hover:text-text'
                        }`}
                      >
                        {candidate.title}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </nav>

        <article className="min-w-0 max-w-3xl">
          <header className="border-b border-rail pb-6">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-text-dim">
              {page.group}
            </p>
            <h1 className="mt-1.5 text-2xl font-semibold tracking-tight text-text">
              {page.title}
            </h1>
            <p className="mt-2 text-sm leading-relaxed text-text-muted">{page.description}</p>
          </header>

          <div className="space-y-8 pt-8">
            {page.blocks.map((block, index) => (
              <section key={index}>
                {block.heading ? (
                  <h2 className="mb-3 text-base font-semibold text-text">{block.heading}</h2>
                ) : null}

                {block.paragraphs?.map((paragraph, position) => (
                  <p
                    key={position}
                    className="mb-3 text-sm leading-relaxed text-text-muted last:mb-0"
                  >
                    {paragraph}
                  </p>
                ))}

                {block.list ? (
                  <ul className="mb-3 space-y-1.5 text-sm leading-relaxed text-text-muted">
                    {block.list.map((item, position) => (
                      <li key={position} className="flex gap-2">
                        <span className="text-text-dim">·</span>
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                ) : null}

                {block.table ? (
                  <Card className="overflow-x-auto p-0">
                    <table className="w-full text-left text-sm">
                      <thead>
                        <tr className="border-b border-rail">
                          {block.table.head.map((cell) => (
                            <th
                              key={cell}
                              className="px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-text-dim"
                            >
                              {cell}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {block.table.rows.map((row, position) => (
                          <tr key={position} className="border-b border-rail last:border-0">
                            {row.map((cell, column) => (
                              <td
                                key={column}
                                className={`px-4 py-2.5 align-top ${
                                  column === 0
                                    ? 'font-mono text-xs text-text'
                                    : 'text-text-muted'
                                }`}
                              >
                                {cell}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </Card>
                ) : null}

                {block.code?.map((snippet) => (
                  <div key={snippet.label} className="mb-3 last:mb-0">
                    <CodeBlock label={snippet.label} code={snippet.code} />
                  </div>
                ))}

                {block.note ? (
                  <div
                    className={`rounded-lg border p-4 ${
                      block.note.kind === 'warning'
                        ? 'border-warning/40 bg-warning/5'
                        : 'border-info/40 bg-info/5'
                    }`}
                  >
                    <p
                      className={`text-sm font-medium ${
                        block.note.kind === 'warning' ? 'text-warning' : 'text-info'
                      }`}
                    >
                      {block.note.title}
                    </p>
                    <p className="mt-1 text-sm leading-relaxed text-text-muted">{block.note.body}</p>
                  </div>
                ) : null}
              </section>
            ))}
          </div>

          <nav
            aria-label="More"
            className="mt-12 flex flex-wrap items-center justify-between gap-3 border-t border-rail pt-6"
          >
            <Link href="/docs" className="text-sm text-accent hover:underline">
              The whole guide
            </Link>
            <Link href="/login" className="text-sm text-text-muted hover:text-text">
              Sign in
            </Link>
          </nav>
        </article>
      </div>
    </div>
  );
}
