/**
 * Post-build: add .js extensions to all ESM import/specifier paths in dist.
 * Node ESM requires exact file extensions; tsc emits bare specifiers.
 */
import { readdir, readFile, writeFile, stat } from 'fs/promises';
import { join, extname } from 'path';

const EXTENSIONS = ['.js', '.ts', '.tsx', '.jsx', '.mjs', '.cjs'];

async function walk(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) files.push(...(await walk(full)));
    else if (/\.(js|mjs|ts|tsx)$/.test(entry.name)) files.push(full);
  }
  return files;
}

const dist = join(process.cwd(), 'dist');
const files = await walk(dist);

let total = 0;
for (const file of files) {
  const prev = await readFile(file, 'utf8');
  const next = prev
    // import "path" or import "path/something" — only bare specifiers (no .js already, no http://, no ./ or ../)
    .replace(/(?<=import\s+[^"'`]*from\s+['"`])(?!https?:\/\/|触|\.\/|\.\.\/)([^'"`\n]+)(?=['"`])/g, (m, spec) => {
      if (extname(spec) === '') return spec + '.js';
      return m;
    })
    // export from "path"
    .replace(/(?<=export\s+from\s+['"`])(?!https?:\/\/|触|\.\/|\.\.\/)([^'"`\n]+)(?=['"`])/g, (m, spec) => {
      if (extname(spec) === '') return spec + '.js';
      return m;
    })
    // dynamic import("path")
    .replace(/(?<=import\()['"`])(?!https?:\/\/|触|\.\/|\.\.\/)([^'"`\n]+)(?=['"`])/g, (m, spec) => {
      if (extname(spec) === '') return spec + '.js';
      return m;
    });

  if (next !== prev) {
    await writeFile(file, next);
    total++;
  }
}

console.log(`Added .js extensions to ${total} files in dist/`);
