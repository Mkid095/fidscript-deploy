/**
 * The shape of a documentation page.
 *
 * A page is a title, a sentence about it, and a list of blocks. The blocks
 * are what a person reads: a heading, some words, a list, a piece of code
 * they can copy, or a note they should not skip.
 */
export interface DocBlock {
  /** A heading. The first block of a page is its introduction. */
  heading?: string;
  paragraphs?: string[];
  /** A list of things. */
  list?: string[];
  /** A piece of code, with the name of the language it is in. */
  code?: { label: string; code: string }[];
  /** Something worth saying loudly. */
  note?: { kind: 'note' | 'warning'; title: string; body: string };
  /** A table of things and what they are. */
  table?: { head: string[]; rows: string[][] };
}

export interface DocPage {
  slug: string;
  title: string;
  /** The sentence under the title. */
  description: string;
  /** Where it sits in the guide. */
  group: 'Start' | 'Build' | 'Platform' | 'Operate';
  blocks: DocBlock[];
}
