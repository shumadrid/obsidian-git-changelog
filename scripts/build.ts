import type { CliTaskResult } from 'obsidian-dev-utils/ScriptUtils/CliUtils';

import { buildWithSvelte } from './buildWithSvelte.ts';

export async function invoke(): Promise<CliTaskResult> {
  return await buildWithSvelte(false);
}
