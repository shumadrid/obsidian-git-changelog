import type GitChangelogPlugin from 'main.ts';

import { DiffFileStatus } from 'types.ts';

import type { DiffResultNameStatusFile } from './simpleGitTypes.ts';

import { DiffNameStatus } from './simpleGitTypes.ts';

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
    '--no-renames'
  ];

  // We don't have to assign the DiffAlgorithm and the WhitespaceIgnoreMode settings because the set that this function returns is just going to be used as a helper set in the runRepoDiff function for assigning an added or deleted file status to changed files that were detected in runRepoDiff using all the proper settings.
  // If after applying the diff settings, some changed files in runRepoDiff become identical, the runRepoDiff function will simply skip those, and those same files that were detected as changes in this function are never going to be accessed, so they can't return incorrect file statuses.
  // Also, crossing the rename threshold because of diff settings mismatch isn't a concern since this function isn't used to determine renamed file statuses.

  if (pathSpec.length > 0) {
    diffStatusArguments.push('--', ...pathSpec);
  }
  const git = await plugin.getGit();
  const diffStatusResult = await git.diffSummary(diffStatusArguments);

  const changedFilesMap: Record<string, DiffFileStatus> = {};
  for (const file of diffStatusResult.files as DiffResultNameStatusFile[]) {
    switch (file.status) {
      case DiffNameStatus.ADDED: {
        changedFilesMap[file.file] = DiffFileStatus.Added;
        break;
      }
      case DiffNameStatus.DELETED: {
        changedFilesMap[file.file] = DiffFileStatus.Deleted;
        break;
      }
      // All other types are going to be discarded from this list
      default: {
        changedFilesMap[file.file] = DiffFileStatus.Modified;
        if (
          ![DiffNameStatus.MODIFIED, DiffNameStatus.RENAMED].contains(
            file.status ?? DiffNameStatus.MODIFIED
          )
        ) {
          plugin.consoleDebug(
            `Unexpected file status of ${file.file}:`,
            file.status
          );
        }
      }
    }
  }
  return changedFilesMap;
}
