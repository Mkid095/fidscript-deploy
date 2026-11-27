import type { Mailbox } from './mail';

/**
 * The sieve compiler: structured filter rules → the one script Stalwart runs.
 *
 * This Stalwart build accepts no structured filters, only a plain sieve
 * script that it syntax-checks on write — and its parser is particular:
 * the header test takes the match-key in tag form (`:contains`), and the
 * `fileinto` capability must be declared with `require` before use. Both
 * were verified against the live parser, not just the RFC.
 */

export interface FilterRuleInput {
  matchKey: 'from' | 'subject';
  matchValue: string;
  action: 'move' | 'forward' | 'junk';
  // move → the mailbox id; forward → the address; junk → ignored.
  target: string;
}

function sieveQuote(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, ' ');
}

/** One rule's body: the `if` block, or a kept message with a comment. */
function compileRule(rule: FilterRuleInput, mailboxes: Mailbox[]): string {
  const header = rule.matchKey === 'subject' ? 'Subject' : 'From';
  const condition = `if header :contains ${JSON.stringify([header])} "${sieveQuote(rule.matchValue)}"`;

  switch (rule.action) {
    case 'move': {
      const folder = mailboxes.find((m) => m.id === rule.target);
      if (!folder) {
        return `# Rule skipped — the target folder no longer exists:\n${condition} {\n  keep;\n}`;
      }
      return `${condition} {\n  fileinto "${sieveQuote(folder.name)}";\n}`;
    }
    case 'forward':
      return `${condition} {\n  redirect "${sieveQuote(rule.target)}";\n}`;
    case 'junk': {
      const junk = mailboxes.find((m) => m.role === 'junk');
      if (!junk) {
        return `# Rule skipped — this account has no junk folder:\n${condition} {\n  keep;\n}`;
      }
      return `${condition} {\n  fileinto "${sieveQuote(junk.name)}";\n}`;
    }
  }
}

/** All rules, top to bottom. Zero rules → a comment-only script (valid). */
export function compileFilterRules(rules: FilterRuleInput[], mailboxes: Mailbox[]): string {
  const lines = [
    `# FIDScript webmail — generated from ${rules.length} filter rule${rules.length === 1 ? '' : 's'}.`,
    '# Edit the rules in Settings → Filters & Forwarding, not this script.',
  ];
  // fileinto is a declared capability in this parser; announce it only
  // when a rule actually files mail somewhere.
  if (rules.some((rule) => rule.action === 'move' || rule.action === 'junk')) {
    lines.push('require ["fileinto"];');
  }
  for (const rule of rules) {
    lines.push(compileRule(rule, mailboxes));
  }
  return `${lines.join('\n\n')}\n`;
}
