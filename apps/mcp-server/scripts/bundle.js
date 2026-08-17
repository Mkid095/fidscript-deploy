import * as esbuild from 'esbuild';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const sdkRoot = path.resolve(root, '..', '..', 'packages', 'sdk');
const typesRoot = path.resolve(root, '..', '..', 'packages', 'types');
const eventsRoot = path.resolve(root, '..', '..', 'packages', 'events');

await esbuild.build({
  entryPoints: [path.join(root, 'src/index.ts')],
  bundle: true,
  platform: 'node',
  target: 'node20',
  outfile: path.join(root, 'dist/index.js'),
  format: 'esm',
  external: ['@modelcontextprotocol/sdk'],
  alias: {
    '@fidscript-deploy/sdk': sdkRoot + '/src/index.ts',
    '@fidscript-deploy/types': typesRoot + '/src/index.ts',
    '@fidscript-deploy/events': eventsRoot + '/src/index.ts',
  },
  sourcemap: false,
  minify: false,
});
console.log('Bundled MCP server (with SDK aliased) to dist/index.js');
