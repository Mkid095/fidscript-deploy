/**
 * resolve-aliases.js — resolves @/ path aliases in compiled JS output.
 *
 * Layout after pnpm deploy (runtime /app/):
 *   /app/dist/         ← all compiled .js files are here
 *   /app/node_modules/
 *
 * __dirname of a compiled file is like /app/dist/<subdir>/file.js.
 * @/maps to /app/dist/ in runtime.
 * So @/modules/foo → modules/foo (relative path from within dist/).
 *
 * For a file at dist/<subdir>/file.js:
 *   @/modules/foo  →  N levels up from dist/<subdir>/ to dist/, then modules/foo
 *   where N = number of path segments in <subdir>.
 *
 * Example: dist/modules/auth/guards/bar.js (subdir=modules/auth/guards, N=3)
 *   From dist/modules/auth/guards/ go up 3 levels to dist/,
 *   then into modules/foo = ../../../modules/foo
 *
 * Example: dist/app.module.js (subdir=app, N=1)
 *   From dist/app/ go up 1 level to dist/, then modules/foo = ../modules/foo
 */
const fs = require('fs');
const path = require('path');

const dist = path.join(__dirname, 'dist'); // /app/apps/api/dist (runtime __dirname)

function aliasFrom(filePath) {
  // Path inside dist/ where this file lives (e.g. modules/auth/guards or app)
  const fileDir = path.dirname(filePath);        // e.g. /app/apps/api/dist/modules/auth/guards
  const rel = path.relative(dist, fileDir);     // e.g. modules/auth/guards
  if (!rel || rel === fileDir) {
    // File is directly in dist/ root (e.g. dist/app.module.js)
    return '';
  }
  const parts = rel.split(path.sep);            // e.g. [modules, auth, guards]
  return '../'.repeat(parts.length);            // e.g. ../../.. (N levels)
}

function fixFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  const original = content;

  // require('@/modules/foo') → require('../../../modules/foo')
  content = content.replace(/require\("@\/([^"]+)"\)/g, (_, alias) => {
    const prefix = aliasFrom(filePath);
    return `require("${prefix}${alias}")`;
  });

  // import from '@/modules/foo' → import from '../../../modules/foo'
  content = content.replace(/from "@\/([^"]+)"/g, (_, alias) => {
    const prefix = aliasFrom(filePath);
    return `from "${prefix}${alias}"`;
  });

  if (content !== original) {
    fs.writeFileSync(filePath, content);
    console.log('Resolved:', filePath);
  }
}

function walk(dir) {
  for (const entry of fs.readdirSync(dir)) {
    const full = path.join(dir, entry);
    if (fs.statSync(full).isDirectory()) {
      walk(full);
    } else if (entry.endsWith('.js')) {
      fixFile(full);
    }
  }
}

walk(dist);
console.log('Done — @/ aliases resolved in', dist);
