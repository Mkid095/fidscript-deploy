/**
 * The integration guides — how to install from and publish to the registry
 * with each tool. Kept in one place so the CLI and the docs say the same
 * thing.
 */

export interface Guide {
  tool: string;
  summary: string;
  steps: string[];
}

const GUIDES: Guide[] = [
  {
    tool: 'npm',
    summary: 'Install from the private registry, and publish to it.',
    steps: [
      'npm install --registry=https://registry.fidscript.com @fidscript-deploy/sdk',
      'npm config set //registry.fidscript.com/:_authToken <your token>',
      'npm publish --registry=https://registry.fidscript.com',
    ],
  },
  {
    tool: 'pnpm',
    summary: 'Install from the private registry, and publish to it.',
    steps: [
      'pnpm add --registry=https://registry.fidscript.com @fidscript-deploy/sdk',
      'pnpm config set //registry.fidscript.com/:_authToken <your token>',
      'pnpm publish --registry=https://registry.fidscript.com --no-git-checks',
    ],
  },
  {
    tool: 'yarn',
    summary: 'Install from the private registry (Yarn Berry).',
    steps: [
      'yarn config set npmRegistryServer https://registry.fidscript.com',
      'yarn config set "//registry.fidscript.com/:_authToken" <your token>',
      'yarn npm publish --registry=https://registry.fidscript.com',
    ],
  },
  {
    tool: 'vercel',
    summary: 'Let Vercel install private packages.',
    steps: [
      'In the project: Settings → Environment Variables',
      'Add NPM_TOKEN with your registry token, and NPM_REGISTRY=https://registry.fidscript.com',
      'Add a .npmrc with @fidscript-deploy:registry=https://registry.fidscript.com',
    ],
  },
  {
    tool: 'github-actions',
    summary: 'Let a workflow install private packages.',
    steps: [
      'In the repository: Settings → Secrets and variables → Actions',
      'Add a secret NPM_TOKEN with your registry token',
      'Add .npmrc with @fidscript-deploy:registry=https://registry.fidscript.com',
      'Add a .npmrc with //registry.fidscript.com/:_authToken=${NPM_TOKEN}',
    ],
  },
  {
    tool: 'cli',
    summary: 'The FIDScript CLI — publish and inspect without leaving the terminal.',
    steps: [
      'fidscript registry login --token <your token>',
      'fidscript registry whoami',
      'fidscript registry publish --tag latest',
      'fidscript registry list',
    ],
  },
];

export function findGuide(tool: string | undefined): Guide[] | Guide {
  if (!tool) return GUIDES;
  const guide = GUIDES.find((g) => g.tool === tool.toLowerCase());
  return guide ?? [];
}
