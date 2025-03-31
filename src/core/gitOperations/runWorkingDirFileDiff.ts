/* eslint-disable unicorn/prevent-abbreviations */
import type GitChangelogPlugin from 'main.ts';
import type { LogEntry, TextDiffBaseStats } from 'types.ts';

import { assignDiffAlgorithm } from 'core/gitOperations/helper.ts';
import { AbortError } from 'types.ts';

/**
 * Used for status bar stats.
 */
export async function runWorkingDirFileDiff({
  abortSignal,
  oldCommit,
  plugin,
  activeGitFile
}: {
  abortSignal: AbortSignal;
  oldCommit: LogEntry;
  activeGitFile: string;
  plugin: GitChangelogPlugin;
}): Promise<TextDiffBaseStats | undefined> {
  // Status bar calculations should handle cases of undefined oldCommit and oldCommit.fileDeleted === true before reaching this function

  const numstatArguments = ['--numstat', '--color-moved=no', '--no-renames'];

  // Must come before the commit hashes and file paths
  assignDiffAlgorithm(numstatArguments, plugin);

  numstatArguments.push(
    `${oldCommit.hash}:${oldCommit.filePath}`,
    activeGitFile
  );

  if (abortSignal.aborted) {
    throw new AbortError();
  }

  const git = await plugin.getGit();
  const diffNumstatResult = await git.diffSummary(numstatArguments);

  const textDiffStats =
    diffNumstatResult.files.at(0)?.binary === true
      ? undefined
      : {
          baseStats: {
            additions: diffNumstatResult.insertions,
            deletions: diffNumstatResult.deletions
          }
        };

  return textDiffStats?.baseStats;
}
