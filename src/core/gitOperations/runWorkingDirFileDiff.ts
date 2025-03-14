/* eslint-disable unicorn/prevent-abbreviations */
import type GitChangelogPlugin from 'main.ts';
import type { LogEntry, TextDiffBaseStats } from 'types.ts';

import { assignDiffAlgorithm } from 'core/gitOperations/helper.ts';
import { AbortError } from 'types.ts';
import { parseContentChange } from 'utils.ts';

/**
 * Used for status bar stats.
 */
export async function runWorkingDirFileDiff({
  abortSignal,
  oldCommit,
  plugin
}: {
  abortSignal: AbortSignal;
  oldCommit: LogEntry;
  plugin: GitChangelogPlugin;
}): Promise<TextDiffBaseStats | undefined> {
  const numstatArguments = [
    '--numstat',
    '--color-moved=no',
    '-z',
    '--no-renames',
    oldCommit.hash,
    `${oldCommit.filePath}`
  ];

  assignDiffAlgorithm(numstatArguments, plugin);

  if (abortSignal.aborted) {
    throw new AbortError();
  }

  const git = await plugin.getGit();
  const diffNumstatResult = await git.diff(numstatArguments);

  const parts = diffNumstatResult.split('\t');
  const addedString = parts[0];
  const deletedString = parts[1];

  // Determine if this is a binary file or submodule.
  const isBinary = addedString === '-' && deletedString === '-';

  // Parse numeric values for text files.
  const textDiffStats = isBinary
    ? undefined
    : parseContentChange({ addedStr: addedString, deletedStr: deletedString });

  if (abortSignal.aborted) {
    throw new AbortError();
  }

  return textDiffStats?.baseStats;
}
