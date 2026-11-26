/**
 * CLI commands — WhatsApp (the platform's own, via its Evolution API).
 *
 * Mirrors sdk.whatsapp.*: whether a project is connected and reachable,
 * connect it to a key, give it its own instance, or let the platform go.
 * The credential stored is the project's — encrypted by the platform, like
 * every other credential it holds — not a second identity for the operator.
 */
import { Command } from 'commander';
import { print } from '../utils/output';
import { die, loadSdk, CliContext } from './cli-runtime-helpers';

export function registerWhatsappCommands(program: Command, ctx: CliContext): void {
  const whatsapp = new Command('whatsapp');
  whatsapp.description('The platform’s WhatsApp, per project');
  const cfg = ctx.loadConfig();

  const project = (opts: { project?: string }): string =>
    opts.project ?? cfg.currentProject ?? die('No project — pass --project <id> or set a current one');

  whatsapp
    .command('state')
    .description('Connected, reachable, and which instance the project owns')
    .option('-p, --project <id>', 'Project ID', cfg.currentProject ?? '')
    .action(async (opts: { project?: string }) => {
      const sdk = await loadSdk(ctx);
      const s = await sdk.whatsapp.state(project(opts)).catch((e) => die(short(e)));
      print(s, format(ctx));
    });

  whatsapp
    .command('connect')
    .description('Connect the project to the WhatsApp platform with a key')
    .requiredOption('-k, --key <apiKey>', 'The platform key, checked before it is stored')
    .option('-i, --instance <name>', 'The instance to use (first visible one, when omitted)')
    .option('-p, --project <id>', 'Project ID', cfg.currentProject ?? '')
    .action(async (opts: { key: string; instance?: string; project?: string }) => {
      const sdk = await loadSdk(ctx);
      const res = await sdk.whatsapp.connect(project(opts), opts.key, opts.instance).catch((e) => die(short(e)));
      if (!res.ok) die(res.error ?? 'the platform key could not see any instance');
      print(res, format(ctx));
    });

  whatsapp
    .command('identity')
    .description('Create (or create again) the project’s own instance')
    .option('-p, --project <id>', 'Project ID', cfg.currentProject ?? '')
    .action(async (opts: { project?: string }) => {
      const sdk = await loadSdk(ctx);
      const res = await sdk.whatsapp.identity(project(opts)).catch((e) => die(short(e)));
      print(res, format(ctx));
    });

  whatsapp
    .command('disconnect')
    .description('Let the WhatsApp platform go (the remote instance is kept)')
    .option('-p, --project <id>', 'Project ID', cfg.currentProject ?? '')
    .action(async (opts: { project?: string }) => {
      const sdk = await loadSdk(ctx);
      const res = await sdk.whatsapp.disconnect(project(opts)).catch((e) => die(short(e)));
      print(res, format(ctx));
    });

  program.addCommand(whatsapp);
}

function format(ctx: CliContext): 'table' | 'json' | 'raw' {
  return (ctx.loadConfig().outputFormat as 'table' | 'json' | 'raw') ?? 'table';
}

function short(e: unknown): string {
  return (e as { message?: string })?.message ?? String(e);
}
