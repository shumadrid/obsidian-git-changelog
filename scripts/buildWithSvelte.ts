import type { BuildOptions } from 'esbuild';
import type { CliTaskResult } from 'obsidian-dev-utils/ScriptUtils/CliUtils';

import {
  BuildMode,
  buildObsidianPlugin
} from 'obsidian-dev-utils/ScriptUtils/esbuild/ObsidianPluginBuilder';

export async function buildWithSvelte(
  developmentMode: boolean
): Promise<CliTaskResult> {
  return await buildObsidianPlugin({
    customizeEsbuildOptions: (options: BuildOptions) => {
      options.dropLabels = developmentMode ? undefined : ['DEV'];
    },

    customEsbuildPlugins: [
      {
        name: 'add-condition',
        setup(build): void {
          build.initialOptions.conditions?.push('svelte');
        }
      }
    ],
    mode: developmentMode ? BuildMode.Development : BuildMode.Production
  });
}
