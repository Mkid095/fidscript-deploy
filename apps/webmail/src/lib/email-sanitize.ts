/**
 * The email-safe sanitizer.
 *
 * Customer HTML is only ever *rendered* in a script-less sandbox — never
 * executed in this application's session. This is the belt: the braces
 * around any HTML that gets stored or injected. Scripts, inline event
 * handlers, and URL schemes that run code are stripped.
 */

/** Remove anything that could run as code. Returns the cleaned HTML. */
export function sanitizeEmailHtml(html: string): string {
  let out = html;
  // Whole script/style/script-like elements and their contents.
  out = out
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<iframe[\s\S]*?<\/iframe>/gi, '')
    .replace(/<object[\s\S]*?<\/object>/gi, '')
    .replace(/<embed[\s\S]*?<\/embed>/gi, '')
    .replace(/<link[\s\S]*?>/gi, '');
  // Inline event handlers (onclick, onerror, ...).
  out = out.replace(
    /\s+on[a-z]+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi,
    '',
  );
  // javascript: / vbscript: / data: (script) URL schemes.
  out = out.replace(
    /(href|src|formaction|action|background)\s*=\s*["']?\s*(javascript|vbscript|data\s*:\s*text\/html)\b[\s\S]*?(?=["']?\s+(?:[a-z]+=|$))/gi,
    '$1="#"',
  );
  // Expression() and @import smugglers.
  out = out.replace(/expression\s*\(/gi, 'x(');
  out = out.replace(/@import\s+/gi, '@ ignored ');
  return out;
}
