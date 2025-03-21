import type GitChangelogPlugin from 'main.ts';
import type { DiffResultNameStatusFile } from 'simple-git';

import { DiffNameStatus } from 'simple-git';
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
    '--no-renames'
  ];
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
