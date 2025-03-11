import type GitChangelogPlugin from 'main.ts';

import { DiffFileStatus } from 'types.ts';

/**
 * Check the number of changed files and if they are added, modified or deleted. this function is needed because git diff --numstat doesn't say if a file is added or deleted
 */
export async function runRepoDiffStatus({
  newCommit,
  oldCommit,
  pathSpec,
  plugin
}: {
  newCommit: string;
  oldCommit?: string;
  pathSpec: string[];
  plugin: GitChangelogPlugin;
}): Promise<Record<string, DiffFileStatus> | undefined> {
  if (oldCommit === undefined) {
    return undefined;
  }
  const diffStatusArguments = [
    oldCommit,
    newCommit,
    '--name-status',
    // Turns off rename detection, even when the configuration file gives the default to run rename detection.
    '--no-renames',
    '-z'
  ];
  if (pathSpec.length > 0) {
    diffStatusArguments.push('--', ...pathSpec);
  }
  const git = await plugin.getGit();
  const diffStatusResult = await git.diff(diffStatusArguments);

  const tokens = diffStatusResult
    .split('\0')
    .filter((token) => token.length > 0);
  const changedFilesMap: Record<string, DiffFileStatus> = {};

  // Tokens should alternate between the status and the file path.
  // eslint-disable-next-line no-magic-numbers
  for (let index = 0; index < tokens.length; index += 2) {
    const rawStatus = tokens[index];
    const filePath = tokens[index + 1];
    const statusSymbol = rawStatus.charAt(0);

    // BUG:?
    switch (statusSymbol) {
      case 'A': {
        changedFilesMap[filePath] = DiffFileStatus.Added;
        break;
      }
      case 'D': {
        changedFilesMap[filePath] = DiffFileStatus.Deleted;
        break;
      }
      // All other types are going to be discarded from this list
      default: {
        changedFilesMap[filePath] = DiffFileStatus.Modified;
      }
    }
  }
  return changedFilesMap;
}
