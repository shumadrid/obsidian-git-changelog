/* eslint-disable unicorn/filename-case */

import { formatWithPrettier } from './formatWithPrettier.ts';

export async function invoke(): Promise<void> {
  await formatWithPrettier(false);
}
