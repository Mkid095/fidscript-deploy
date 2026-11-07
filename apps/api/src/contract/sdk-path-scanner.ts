import * as fs from 'fs';
import * as path from 'path';
import { readPathAfter, normalisePath } from '@/contract/sdk-path-reader';

/**
 * The paths the SDK calls.
 *
 * The SDK is the platform's own client, and every method it exposes is a
 * call to an API route. When the two disagree the disagreement is silent —
 * the request 404s and the screen renders empty — so the paths are read
 * out of the SDK's source and checked against the API's own route table.
 *
 * A path is read from a template literal or a plain string. A call whose
 * path is built at runtime (a variable) is reported as **unverifiable**
 * rather than as a failure: it is not drift, it is a path this scanner
 * cannot follow.
 */

/** One call the SDK makes. */
export interface SdkCall {
  /** The HTTP method. */
  method: string;
  /** The path, with every interpolation replaced by `:param`. */
  path: string;
  /** The file the call was found in. */
  file: string;
  /** The line the call was found on. */
  line: number;
}

/** The SDK's client verbs. */
const CLIENT_METHODS = ['get', 'post', 'put', 'patch', 'delete'];

/**
 * Read every API call from the SDK's source.
 *
 * The SDK is read from the repository, not from its build output, so the
 * check follows the source of truth.
 */
export function scanSdkCalls(sdkRoot: string): { calls: SdkCall[]; unverifiable: number } {
  const calls: SdkCall[] = [];
  let unverifiable = 0;

  for (const file of sdkSourceFiles(sdkRoot)) {
    const source = fs.readFileSync(file, 'utf8');
    const found = scanSource(source);
    for (const call of found.calls) {
      calls.push({ ...call, file: path.relative(sdkRoot, file) });
    }
    unverifiable += found.unverifiable;
  }

  return { calls, unverifiable };
}

/** Find the client calls in one file. */
function scanSource(source: string): { calls: Omit<SdkCall, 'file'>[]; unverifiable: number } {
  const calls: Omit<SdkCall, 'file'>[] = [];
  let unverifiable = 0;

  for (const verb of CLIENT_METHODS) {
    const marker = `client.${verb}`;
    let from = 0;
    for (;;) {
      const at = source.indexOf(marker, from);
      if (at === -1) break;
      from = at + marker.length;

      const literal = readPathAfter(source, from);
      if (literal === null) {
        unverifiable += 1;
        continue;
      }
      calls.push({
        method: verb.toUpperCase(),
        path: normalisePath(literal),
        line: lineOf(source, at),
      });
    }
  }

  return { calls, unverifiable };
}

/** The line a character offset is on (1-based). */
function lineOf(source: string, index: number): number {
  let line = 1;
  for (let i = 0; i < index; i++) {
    if (source[i] === '\n') line += 1;
  }
  return line;
}

/** Every TypeScript file in the SDK's module directory. */
function sdkSourceFiles(sdkRoot: string): string[] {
  const dir = path.join(sdkRoot, 'modules');
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir)
    .filter((f) => f.endsWith('.ts') && !f.endsWith('.spec.ts'))
    .map((f) => path.join(dir, f));
}
