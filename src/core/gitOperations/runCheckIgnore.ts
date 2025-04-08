import type { SimpleGit } from 'simple-git';

import { AbortError } from 'types.ts';

export async function runCheckIgnore({
  abortSignal,
  activeGitFile,
  git
}: {
  abortSignal: AbortSignal;
  activeGitFile: string;
  git: SimpleGit;
}): Promise<boolean> {
  if (abortSignal.aborted) {
    throw new AbortError();
  }
  const gitCheckIgnoreResult = await git.checkIgnore(activeGitFile);

  if (abortSignal.aborted) {
    throw new AbortError();
  }
  return !gitCheckIgnoreResult || gitCheckIgnoreResult.length > 0;
}
