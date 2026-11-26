/**
 * Interactive prompts for the CLI, on Node's own readline — no dependency.
 *
 * `ask` echoes; `askSecret` does not (it drops the TTY into raw mode and
 * swallows each keystroke), so a password typed for `fidscript login` never
 * lands on the screen or in the shell history. When stdin is not a TTY
 * (a pipe, CI, a test) there is nothing to hide, so both fall back to a
 * plain line read.
 */
import { createInterface } from 'node:readline/promises';

export async function ask(label: string): Promise<string> {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  try {
    return (await rl.question(`${label} `)).trim();
  } finally {
    rl.close();
  }
}

/** Read a secret without echoing it. */
export async function askSecret(label: string): Promise<string> {
  if (!process.stdin.isTTY) {
    return ask(label);
  }
  const stream = process.stdin;
  const out = process.stdout;
  let value = '';
  await new Promise<void>((resolve) => {
    stream.setRawMode(true);
    stream.resume();
    out.write(`${label} `);
    const onData = (buf: Buffer) => {
      for (const byte of buf) {
        if (byte === 13 || byte === 10) {
          // Enter — commit.
          stream.off('data', onData);
          stream.setRawMode(false);
          stream.pause();
          out.write('\n');
          resolve();
          return;
        }
        if (byte === 127 || byte === 8) {
          // Backspace — drop the last character.
          value = value.slice(0, -1);
          out.write('\b \b');
          continue;
        }
        if (byte >= 32) {
          value += String.fromCharCode(byte);
        }
      }
    };
    stream.on('data', onData);
  });
  return value;
}
