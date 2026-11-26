/**
 * CLI command — fidscript configure.
 *
 * Every error message points here ("run: fidscript configure") but it never
 * existed. It sets the two things a machine needs to know: which platform it
 * talks to, and which project is "the current one" for the -p defaults.
 */
import { Command } from 'commander';
import { ask } from '../utils/prompt';
import { loadConfig, saveConfig, loadCredentials } from '../config/index';

export interface ConfigureContext {
  apiUrl?: string;
}

export function addConfigureCommand(program: Command, ctx: ConfigureContext): void {
  program
    .command('configure')
    .description('Set the API URL and the current project for this machine')
    .action(async () => {
      const cfg = loadConfig();
      const apiUrl = (await ask(`API URL [${cfg.apiUrl || 'required'}]`)) || cfg.apiUrl;
      if (!apiUrl) {
        console.error('Error: an API URL is required');
        process.exit(1);
      }

      // The current project: an id the user pastes, or left as is.
      let currentProject = cfg.currentProject;
      const raw = await ask(`Current project id [${currentProject ?? 'none'}]`);
      if (raw) currentProject = raw;

      saveConfig({ ...cfg, apiUrl: apiUrl.replace(/\/+$/, ''), currentProject });
      console.log('Configuration saved to ~/.fidscript/config.json');
      const creds = loadCredentials();
      console.log(
        creds.activeKey || creds.apiKey
          ? 'You have a stored token: commands are ready.'
          : 'No token yet: run `fidscript login`.',
      );
    });
}
