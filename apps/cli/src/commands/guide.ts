/**
 * CLI command — fidscript guide.
 *
 * The complete, human-readable guide: how the credential model works, what
 * every command group does, and how to go from a fresh machine to a running
 * deployment. `fidscript --help` points here; this is the "read me" that
 * actually lives next to the tool.
 */
import { Command } from 'commander';

const GUIDE = `
FIDSCRIPT CLI — OPERATOR GUIDE
=============================

GETTING STARTED (a fresh machine)
  fidscript configure           # where is the platform + which project is "current"
  fidscript login               # email + password → a revocable token, and the
                                # registry account links to the same login
  fidscript whoami              # who am I, and what can I see

HOW CREDENTIALS WORK
  One login reaches everything:
   - \`fidscript login\` proves the password (and MFA, when enrolled), then mints
     a single revocable *account* token. That token acts as you — it can manage
     projects, deploy, publish, and reach WhatsApp/Instant. Project-scoped
     access is still enforced by the platform, not trusted here.
   - The registry (npm) account is linked by the same login, so you do not keep
     a second set of credentials. \`fidscript registry link\` mints (or re-mints)
     the registry token; \`fidscript registry unlink\` breaks the tie and
     revokes the tokens issued under it. The two credentials stay independent:
     revoking the platform token never touches the registry token, and
     unlinking the registry never touches the platform token.
   - Tokens are created, listed, and revoked from the dashboard; the CLI stores
     and uses one. \`fidscript login <key>\` stores a token the dashboard made.

MANAGING A PROJECT
  fidscript projects list | create <name> | get <id>
  fidscript deployments list | get <id> | logs <id>
  fidscript functions list | create <n> | invoke <id> | logs <id>
  fidscript databases list | create <n> | get <id> | delete <id>
  fidscript storage list-buckets | upload <b> <k> <path> | delete-bucket <n>
  fidscript queues list | create <n> | publish <id> <msg> | purge <id>
  fidscript cron list | create <n> <schedule> | trigger <id> | delete <id>
  fidscript domains list | create <d> | get-dns-records <id> | check-health <id>
  fidscript env list | pull | push
  fidscript email send -t <to> -s <subj> | inbox | status <id> | templates

THE BACKEND + CHANNELS
  fidscript instant status | provision | config | delete     # the data plane
  fidscript whatsapp state | connect | identity | disconnect  # the WhatsApp platform

PUBLISHING TO THE REGISTRY
  fidscript registry link                 # make sure the account is linked
  fidscript registry whoami | list | search <q> | info <pkg>
  fidscript registry publish [dir] [--tag latest]   # publishes to registry.fidscript.com
  fidscript registry guide [tool]         # per-tool install/publish recipes

FOR AN AI AGENT
  fidscript skill install [--agent claude|cursor]   # the operator skill + MCP companion
  fidscript skill remove

OUTPUT + PROJECT TARGETING
  -o table|json|raw on any read command; -p <project> to target one (default: current).

WHEN SOMETHING FAILS
  - "No API URL configured"   → fidscript configure
  - "Not logged in"           → fidscript login
  - "Missing scope"           → the token is narrower than the action; make a broader
                                one in the dashboard, then fidscript login <key>
  - a stopped deployment is not an error; \`deployments get\` shows its real state

The dashboard (Settings → API keys & MCP) is where tokens are created, scoped,
and revoked, and where the registry link is shown. The CLI is the same
platform, from the terminal.
`.trim();

export function addGuideCommand(program: Command): void {
  program
    .command('guide')
    .description('Print the complete operator guide (what --help points to)')
    .action(() => {
      console.log(GUIDE);
    });
}
