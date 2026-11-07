import { describe, it, expect } from 'vitest';

import { DOC_PAGES, findDocPage } from './index';
import { COLS } from '@/components/landing/landing-footer';

/**
 * The guide.
 *
 * The footer promises twelve pages. Every one of them has to exist — a
 * link that leads nowhere is worse than no link at all.
 */
describe('the guide', () => {
  it('has a page for every slug in the footer', () => {
    const promised = COLS.flatMap((column) => column.links.map((link) => link.href));

    for (const href of promised) {
      const slug = href.replace('/docs/', '');
      expect(findDocPage(slug), `${href} has no page`).toBeTruthy();
    }
  });

  it('has no page twice', () => {
    const slugs = DOC_PAGES.map((page) => page.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
  });

  it('gives every page a title, a description and something to read', () => {
    for (const page of DOC_PAGES) {
      expect(page.title.length).toBeGreaterThan(0);
      expect(page.description.length).toBeGreaterThan(0);
      expect(page.blocks.length).toBeGreaterThan(0);
    }
  });

  it('covers every footer link and no more', () => {
    const promised = new Set(COLS.flatMap((column) => column.links.map((link) => link.href)));
    expect(promised.size).toBe(DOC_PAGES.length);
  });
});
