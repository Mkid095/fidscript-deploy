import { afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';

/**
 * The setup every component test gets.
 *
 * `matchMedia` is what the theme code asks the browser about the system
 * preference — jsdom does not have it, and a component that reads it
 * throws before it renders.
 */
if (typeof window !== 'undefined' && !window.matchMedia) {
  window.matchMedia = ((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  })) as unknown as typeof window.matchMedia;
}

afterEach(() => {
  cleanup();
});
