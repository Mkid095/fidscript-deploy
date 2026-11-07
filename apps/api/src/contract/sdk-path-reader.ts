/**
 * Reading a path out of the SDK's source.
 *
 * Between the verb and the path there may be a type argument list and the
 * opening parenthesis — `client.get<{ domains: Domain[] }>('/api/v1/…')` —
 * and the type may itself contain parentheses.
 */

/**
 * Read the path of a call that starts at `from` (just after the verb).
 *
 * Returns the raw path (with `${…}` left as it is), or null when the
 * argument is not a literal.
 */
export function readPathAfter(source: string, from: number): string | null {
  let i = skipWhitespace(source, from);

  if (source[i] === '<') {
    i = skipTypeArguments(source, i);
    i = skipWhitespace(source, i);
  }
  if (source[i] === '(') {
    i = skipWhitespace(source, i + 1);
  }

  const quote = source[i];
  if (quote !== '`' && quote !== "'" && quote !== '"') return null;
  const end = source.indexOf(quote, i + 1);
  if (end === -1) return null;
  return source.slice(i + 1, end);
}

/**
 * Skip a type argument list.
 *
 * The list may contain parentheses, braces and other angle brackets
 * (`client.post<import('./x').Y>(path)`), so the depth is counted over
 * `<` and `>` only, and the closing bracket is the one that brings the
 * depth back to zero.
 */
function skipTypeArguments(source: string, start: number): number {
  let depth = 0;
  for (let i = start; i < source.length; i++) {
    const c = source[i];
    if (c === "'" || c === '"' || c === '`') {
      const end = source.indexOf(c, i + 1);
      if (end === -1) return start;
      i = end;
      continue;
    }
    if (c === '<') depth += 1;
    else if (c === '>') {
      depth -= 1;
      if (depth === 0) return i + 1;
    }
  }
  return start;
}

/** Skip whitespace. */
function skipWhitespace(source: string, from: number): number {
  let i = from;
  while (i < source.length && /\s/.test(source[i])) i += 1;
  return i;
}

/**
 * Normalise a path for comparison.
 *
 * An interpolation becomes `:param`, a trailing slash is dropped, and the
 * leading slash is added if it is missing.
 */
export function normalisePath(raw: string): string {
  // A query string is not part of the path: `?starred=true` says nothing
  // about which route is called.
  const path = raw.split('?')[0];
  const withoutPrefix = path.replace(/^\/?(api\/v1\/)?/, '');
  const segments = withoutPrefix
    .split('/')
    .filter((s) => s.length > 0)
    .map((segment) => {
      if (!segment.includes('${')) return segment;
      // An interpolation at the end of a segment is usually a query string
      // (`connection${params}`); the path is the part before it.
      const literal = segment.split('${')[0];
      return literal.length > 0 ? literal : ':param';
    });
  return '/' + segments.join('/');
}
