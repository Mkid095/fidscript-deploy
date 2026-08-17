/**
 * Post-build: add .js extension ONLY to relative import specifiers in dist JS files.
 * Node ESM requires .js on relative paths; npm packages stay bare.
 * Only touches bare specifiers that look like relative paths (./ or ../ or start with a dir name in dist/).
 */
import { readdir, readFile, writeFile } from 'fs/promises';
import { join, extname, relative, basename } from 'path';

const distDir = join(process.cwd(), 'dist');

async function getJsFiles(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = [];
  for (const e of entries) {
    const full = join(dir, e.name);
    if (e.isDirectory()) files.push(...(await getJsFiles(full)));
    else if (e.isFile() && /\.(js|mjs)$/.test(e.name)) files.push(full);
  }
  return files;
}

// Directories that exist in dist/ — anything not starting with @ or a known npm package name
// is a relative path we need to fix
function isRelativePath(spec, file) {
  // Already has extension
  if (extname(spec)) return false;
  // Starts with ./ or ../ — always relative
  if (spec.startsWith('.')) return true;
  // Scoped npm package @org/package — not relative
  if (spec.startsWith('@')) return false;
  // Contains a slash but no dot-extension — could be npm package or relative path under dist/
  // Dist files only reference their own relative paths (no subdir npm packages)
  // A relative path under dist/ will be like 'commands/foo' or '../utils/output'
  // If spec has no slash, it's a bare npm module like 'commander'
  if (!spec.includes('/')) return false;
  return true;
}

const files = await getJsFiles(distDir);
let changed = 0;

for (const file of files) {
  if (!file.startsWith(distDir)) continue;
  const prev = await readFile(file, 'utf8');

  const next = prev
    .replace(/from\s+['"]([^'"]+)['"]/g, (m, spec) => {
      if (!isRelativePath(spec, file)) return m;
      return `from '${spec}.js'`;
    })
    .replace(/export\s+\*\s+from\s+['"]([^'"]+)['"]/g, (m, spec) => {
      if (!isRelativePath(spec, file)) return m;
      return `export * from '${spec}.js'`;
    })
    .replace(/export\s+\{\s*[^}]+\}\s+from\s+['"]([^'"]+)['"]/g, (m, spec) => {
      if (!isRelativePath(spec, file)) return m;
      return m.replace(`'${spec}'`, `'${spec}.js'`);
    })
    .replace(/import\s*\(['"]([^'"]+)['"]\)/g, (m, spec) => {
      if (!isRelativePath(spec, file)) return m;
      return `import('${spec}.js')`;
    });

  if (next !== prev) {
    await writeFile(file, next);
    changed++;
    console.log(`  + .js → ${relative(process.cwd(), file)}`);
  }
}

console.log(`Fixed ${changed} file(s) in dist/`);
