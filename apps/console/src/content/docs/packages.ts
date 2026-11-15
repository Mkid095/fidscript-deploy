import type { DocPage } from './types';

export const packages: DocPage = {
  slug: 'packages',
  title: 'Packages',
  description: 'A private registry, and how to publish to it.',
  group: 'Platform',
  blocks: [
    {
      paragraphs: [
        'The registry is the platform’s own: an npm registry, and a place for the artifacts your team makes. It is private — what is published to it is not on the public registry.',
        'A package is published from a machine, not from the console. The console gives you the address, the way in, and what is already there.',
      ],
    },
    {
      heading: 'The scopes',
      paragraphs: [
        'Packages live under a scope, and the scope is what the registry routes on. The platform’s own packages are under @fidscript-deploy.',
        'A scope of a project’s own is not configured on this deployment — the registry knows the scope above, and the packages under it.',
      ],
      code: [
        {
          label: '.npmrc',
          code: `@fidscript-deploy:registry=https://registry.example.com
//registry.example.com/:_authToken=\${NPM_TOKEN}`,
        },
      ],
    },
    {
      heading: 'Publishing',
      list: [
        'Sign in to the registry — npm login --registry <address>.',
        'Point the scope at it, in the package’s own .npmrc.',
        'Publish it — npm publish.',
      ],
      code: [
        {
          label: 'The walkthrough',
          code: `npm login --registry https://registry.example.com
npm config set @fidscript-deploy:registry https://registry.example.com
npm publish`,
        },
      ],
    },
    {
      heading: 'The token',
      paragraphs: [
        'The token is read from the environment — NPM_TOKEN or FIDScript_REGISTRY_TOKEN — so a CI job publishes without ever holding it in a file.',
        'It is a credential that can publish and unpublish. It is kept out of the repository, and out of the history.',
      ],
      note: {
        kind: 'warning',
        title: 'A token in a repository is a published token',
        body: 'The token belongs in the environment of the machine that publishes, not in the package.',
      },
    },
    {
      heading: 'Installing in a deployment',
      paragraphs: [
        'A deployment that depends on a private package installs through the registry with its own credentials: the token is a variable on the project, and the build reads it from there. It never touches the repository, and it is not in the image that is built.',
      ],
      list: [
        'In the project: add NPM_TOKEN with your registry token.',
        'The next deployment installs through the platform registry, with it.',
      ],
      note: {
        kind: 'note',
        title: 'A scope can be open to anonymous reads',
        body: 'The registry’s owner opens a scope on the platform’s Applications screen. An open scope needs no token at all: the repository carries a .npmrc with the scope’s address only, and the build installs from it. Publishing stays closed either way — the rule decides who reads, not who writes.',
      },
    },
    {
      heading: 'Maven and Gradle',
      paragraphs: [
        'The registry serves Maven artifacts as well. The repository goes in the settings, and the same token authenticates it.',
      ],
      code: [
        {
          label: 'Maven — settings.xml',
          code: `<repositories>
  <repository>
    <id>fidscript</id>
    <url>https://registry.example.com/maven</url>
  </repository>
</repositories>`,
        },
        {
          label: 'Gradle — build.gradle',
          code: `repositories {
  maven { url "https://registry.example.com/maven" }
}`,
        },
      ],
    },
    {
      heading: 'The console',
      paragraphs: [
        'The project’s Packages screen shows the registry’s address, the packages that are published in it, and the versions of each — with the README they were published with.',
        'It is the same registry everybody uses; there is no second one for a project.',
      ],
    },
  ],
};
