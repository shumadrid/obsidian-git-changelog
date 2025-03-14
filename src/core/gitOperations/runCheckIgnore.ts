import type GitChangelogPlugin from 'main.ts';

import { AbortError } from 'types.ts';

export async function runCheckIgnore({
  abortSignal,
  activeGitFile,
  plugin
}: {
  abortSignal: AbortSignal;
  activeGitFile: string;
  plugin: GitChangelogPlugin;
}): Promise<boolean> {
  if (abortSignal.aborted) {
    throw new AbortError();
  }
  const gitCheckIgnoreResult = await plugin
    .getGitPlugin()
    .gitManager.git.checkIgnore(activeGitFile);

  if (abortSignal.aborted) {
    throw new AbortError();
  }
  return !gitCheckIgnoreResult || gitCheckIgnoreResult.length > 0;
}
