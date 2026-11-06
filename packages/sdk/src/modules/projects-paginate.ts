import { FidscriptClient } from '../client';

/**
 * Cursor-paginated list endpoints.
 *
 * The platform's lists answer with a page and a cursor; this walks the
 * cursor so a caller can treat a list as a list.
 */
export async function* paginate<T>(
  client: FidscriptClient,
  path: string,
  params: Record<string, unknown> = {},
  pageSize = 100,
): AsyncGenerator<T> {
  let cursor: string | undefined;
  while (true) {
    const res = await client.get<{ items: T[]; nextCursor?: string }>(path, {
      ...params,
      ...(cursor ? { cursor } : {}),
      limit: pageSize,
    });
    for (const item of res.items) yield item;
    cursor = res.nextCursor;
    if (!cursor) break;
  }
}
