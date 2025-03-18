// eslint-disable-next-line unicorn/prevent-abbreviations
import type { CliTaskResult } from 'obsidian-dev-utils/ScriptUtils/CliUtils';

import {
  BuildMode,
  buildObsidianPlugin
} from 'obsidian-dev-utils/ScriptUtils/esbuild/ObsidianPluginBuilder';

export async function invoke(): Promise<CliTaskResult> {
  return await buildObsidianPlugin({
    customEsbuildPlugins: [
      {
        name: 'add-condition',
        setup(build): void {
          build.initialOptions.conditions?.push('svelte');
        }
      }
    ],
    mode: BuildMode.Development
  });
}
