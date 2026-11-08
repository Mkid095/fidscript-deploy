import type { DocPage } from './types';

import { gettingStarted } from './getting-started';
import { installation } from './installation';
import { deployAnApp } from './deploy-an-app';
import { configuration } from './configuration';
import { databases } from './databases';
import { email } from './email';
import { storage } from './storage';
import { packages } from './packages';
import { domains } from './domains';
import { edgeFunctions } from './edge-functions';
import { queues } from './queues';
import { scheduler } from './scheduler';
import { monitoring } from './monitoring';

export type { DocPage, DocBlock } from './types';

/** Every page of the guide, in the order it is read. */
export const DOC_PAGES: DocPage[] = [
  gettingStarted,
  installation,
  deployAnApp,
  configuration,
  databases,
  email,
  storage,
  packages,
  domains,
  edgeFunctions,
  queues,
  scheduler,
  monitoring,
];

/** The page with this slug, if there is one. */
export function findDocPage(slug: string): DocPage | undefined {
  return DOC_PAGES.find((page) => page.slug === slug);
}

/** The pages of one group, in order. */
export function docGroup(group: DocPage['group']): DocPage[] {
  return DOC_PAGES.filter((page) => page.group === group);
}

/** The groups, in the order they are read. */
export const DOC_GROUPS: DocPage['group'][] = [
  'Start',
  'Build',
  'Platform',
  'Operate',
];
