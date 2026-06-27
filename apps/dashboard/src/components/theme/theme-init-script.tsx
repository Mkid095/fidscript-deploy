/**
 * Inline script injected into <head> before React hydrates. Reads the stored
 * theme preference (or system preference) and sets data-theme on <html>
 * synchronously, preventing the dreaded "white flash" on dark-themed users
 * when the page first loads.
 */
export function ThemeInitScript() {
  const script = `
    (function() {
      try {
        var stored = localStorage.getItem('fidscript_theme');
        var t = stored || 'dark';
        if (t === 'system') {
          t = window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
        }
        document.documentElement.setAttribute('data-theme', t);
        document.documentElement.style.colorScheme = t;
      } catch (e) {}
    })();
  `;
  return <script dangerouslySetInnerHTML={{ __html: script }} />;
}
