/* eslint-disable unicorn/prevent-abbreviations */
import type { SimpleGit } from 'simple-git';
import type {
  DiffAlgorithm,
  LogEntry,
  TextDiffBaseStats,
  WhitespaceIgnoreMode
} from 'types.ts';

import {
  assignDiffAlgorithm,
  assignWhitespaceIgnoreSettings
} from 'core/gitOperations/helper.ts';
import { AbortError } from 'types.ts';

/**
 * Used for status bar stats.
 */
export async function runWorkingDirFileDiff({
  abortSignal,
  oldCommit,
  activeGitFile,
  git,
  diffAlgorithm,
  whitespaceIgnoreMode,
  ignoreBlankLines
}: {
  diffAlgorithm: DiffAlgorithm;
  abortSignal: AbortSignal;
  oldCommit: LogEntry;
  activeGitFile: string;
  git: SimpleGit;
  whitespaceIgnoreMode: WhitespaceIgnoreMode;
  ignoreBlankLines: boolean;
}): Promise<TextDiffBaseStats | undefined> {
  if (abortSignal.aborted) {
    throw new AbortError();
  }

  // Status bar calculations should handle cases of undefined oldCommit and oldCommit.fileDeleted === true before reaching this function

  const numstatArguments = ['--numstat', '--color-moved=no', '--no-renames'];

  // Must come before the commit hashes and file paths
  assignDiffAlgorithm({ arguments_: numstatArguments, diffAlgorithm });
  assignWhitespaceIgnoreSettings({
    arguments_: numstatArguments,
    whitespaceIgnoreMode,
    ignoreBlankLines
  });

  numstatArguments.push(
    `${oldCommit.hash}:${oldCommit.filePath}`,
    activeGitFile
  );

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
