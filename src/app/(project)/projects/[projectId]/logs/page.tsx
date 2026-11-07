import { redirect } from 'next/navigation';

import { serverApi as api } from '@/lib/api/server';
import { getProject } from '@/lib/api/project';
import { Card, PageHeader, SectionHeader } from '@/components/ui/card';
import { Page } from '@/components/ui/page';
import { Badge, EmptyState, ErrorState } from '@/components/ui/feedback';

export const metadata = { title: 'Logs' };

interface LogEntry {
  id: string;
  stream: string;
  level: string;
  message: string;
  timestamp: string;
}

/**
 * What this project has written down.
 *
 * The streams it writes to, the shape of what it writes, and the entries
 * themselves.
 */
export default async function ProjectLogsPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;

  const project = await getProject(projectId).catch(() => null);
  if (!project) redirect('/projects');

  const [streams, stats, entries] = await Promise.all([
    api
      .get<{ streams: Array<{ name: string; count?: number }> }>(`/projects/${project.id}/logs/streams`)
      .catch(() => ({ streams: [] as Array<{ name: string; count?: number }> })),
    api
      .get<{ total: number; byLevel: Record<string, number>; streamCount: number }>(
        `/projects/${project.id}/logs/stats`,
      )
      .catch(() => null),
    api
      .get<{ logs: LogEntry[] }>(`/projects/${project.id}/logs`)
      .catch(() => null),
  ]);

  return (
    <Page>
      <PageHeader title="Logs" description="What this project has written down." />

      {stats ? (
        <section>
          <SectionHeader title="The numbers" />
          <Card className="divide-y divide-rail">
            <Row term="Entries" value={stats.total} />
            <Row term="Streams" value={stats.streamCount} />
            {Object.entries(stats.byLevel ?? {}).map(([level, count]) => (
              <Row key={level} term={level} value={count} />
            ))}
          </Card>
        </section>
      ) : null}

      <section>
        <SectionHeader title="Streams" />
        <Card>
          {streams.streams.length === 0 ? (
            <EmptyState
              title="Nothing has been written yet"
              body="A stream appears here once something in the project writes to it."
            />
          ) : (
            <ul className="divide-y divide-rail">
              {streams.streams.map((stream) => (
                <li key={stream.name} className="flex items-center justify-between gap-4 px-4 py-2.5">
                  <span className="font-mono text-sm text-text">{stream.name}</span>
                  {typeof stream.count === 'number' ? (
                    <Badge tone="neutral">{stream.count}</Badge>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </Card>
      </section>

      <section>
        <SectionHeader title="Entries" />
        {entries === null ? (
          <ErrorState
            title="The entries could not be read"
            message="The platform refused the request for this project's log entries."
          />
        ) : entries.logs.length === 0 ? (
          <Card>
            <EmptyState title="No entries" body="Nothing has been written to the logs yet." />
          </Card>
        ) : (
          <Card>
            <ul className="divide-y divide-rail">
              {entries.logs.map((entry) => (
                <li key={entry.id} className="px-4 py-2.5">
                  <div className="flex items-center justify-between gap-3">
                    <span className="font-mono text-xs text-text-dim">{entry.stream}</span>
                    <Badge tone={entry.level === 'error' || entry.level === 'fatal' ? 'danger' : 'neutral'}>
                      {entry.level}
                    </Badge>
                  </div>
                  <p className="mt-1 text-sm text-text">{entry.message}</p>
                </li>
              ))}
            </ul>
          </Card>
        )}
      </section>
    </Page>
  );
}

function Row({ term, value }: { term: string; value: number }) {
  return (
    <div className="flex items-center justify-between gap-4 px-4 py-2.5">
      <span className="text-sm text-text-muted">{term}</span>
      <span className="text-sm text-text">{value}</span>
    </div>
  );
}
