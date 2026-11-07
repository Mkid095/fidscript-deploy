/**
 * CLI command — `init` scaffolds a new project from a template.
 * Extracted from bin/fidscript.ts to keep the entry point under the ANPAS 150-line limit.
 */
import { Command } from 'commander';
import { CliContext, die, loadSdk } from './cli-runtime-helpers';

export type { CliContext };

export function addInitCommand(program: Command, ctx: CliContext): void {
  program
    .command('init')
    .description('Scaffold a new project from a template')
    .argument('<template>', 'Template ID (e.g. static-site, node-api)')
    .argument('<name>', 'Name for the new project')
    .option('-p, --project <id>', 'Parent project ID for template sourcing')
    .action(async (template: string, name: string, opts: { project?: string }) => {
      const cfg = ctx.loadConfig();
      const sdk = await loadSdk(ctx);
      const parentProjectId = opts.project ?? cfg.currentProject
        ?? die('No project ID (--project or set currentProject in config)');
      console.log(`Scaffolding project "${name}" from template "${template}"...`);
      try {
        const result = await sdk.templates.generateAndDeploy(parentProjectId, template, name, {});
        console.log(`Project created: ${result.project.id}`);
        console.log(`Deployment: ${result.deployment.id} (${result.deployment.status})`);
      } catch (e) {
        die(`Failed to scaffold project: ${(e as Error).message}`);
      }
    });
}