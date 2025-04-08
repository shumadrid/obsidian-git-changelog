import type GitChangelogPlugin from 'main.ts';
import type { SimpleGit } from 'simple-git';
import type {
  DiffAlgorithm,
  FileLogEntry,
  WhitespaceIgnoreMode
} from 'types.ts';

import { FileChangelogEntry } from 'core/ChangelogEntry.svelte.ts';
import {
  assignDiffAlgorithm,
  assignWhitespaceIgnoreSettings,
  calculateFileStatusRenamedOrMoved
} from 'core/gitOperations/helper.ts';
import { AbortError, DiffFileStatus } from 'types.ts';

export async function runFileDiff({
  abortSignal,
  newCommit,
  oldCommit,
  plugin,
  git,
  diffAlgorithm,
  whitespaceIgnoreMode,
  ignoreBlankLines,
  emptyTreeHash
}: {
  abortSignal: AbortSignal;
  newCommit: FileLogEntry;
  oldCommit?: FileLogEntry;
  plugin?: GitChangelogPlugin;
  git: SimpleGit;
  diffAlgorithm: DiffAlgorithm;
  whitespaceIgnoreMode: WhitespaceIgnoreMode;
  ignoreBlankLines: boolean;
  emptyTreeHash: string;
}): Promise<FileChangelogEntry | undefined> {
  if (abortSignal.aborted) {
    throw new AbortError();
  }

  const oldVersionIsEmpty =
    oldCommit === undefined || oldCommit.fileDeleted === true;

  if (oldVersionIsEmpty && newCommit.fileDeleted) {
    // I assumed that the other should always be defined if one is undefined, since newCommit.hash is only undefined for commits where the file was deleted, and it can't get deleted if it didn't exist before, but these are statuses calculated from comparing neighboring commits, but we are diffing selected commits only, so maybe it's possible that we get in a situation where we compare some initial version commit (that isn't the actual initial commit, so that commit could be a deletion of that file, if a file was newly added and then deleted in the same interval) with an empty state
    plugin?.consoleDebug(
      'oldCommit and newCommit are both undefined, assumption is wrong'
    );

    return undefined;
  }

  const numstatArguments = [
    '--numstat',
    '--color-moved=no',
    '--no-renames'
    // `--exit-code`,
  ];
  assignDiffAlgorithm({ arguments_: numstatArguments, diffAlgorithm });
  assignWhitespaceIgnoreSettings({
    arguments_: numstatArguments,
    whitespaceIgnoreMode,
    ignoreBlankLines
  });

  // Only one of these can be true at the same time since we are returning early if they are both true.
  if (oldVersionIsEmpty || newCommit.fileDeleted) {
    numstatArguments.push(
      emptyTreeHash,
      oldVersionIsEmpty ? newCommit.hash : oldCommit.hash,
      // This part is important. It tells git where is the explicit separation between revisions and the file path. Without it, git will not always be able to parse the file path correctly.
      '--',
      // We can pass oldCommit.filePath if the new commit is just a deletion of that file, meaning the file names are the same. We just inverse the result later to count the showed additions as deletions.

      oldVersionIsEmpty ? newCommit.filePath : oldCommit.filePath
    );
  } else {
    numstatArguments.push(
      `${oldCommit.hash}:${oldCommit.filePath}`,
      `${newCommit.hash}:${newCommit.filePath}`
    );
  }

  let fileStatus: DiffFileStatus;

  if (oldVersionIsEmpty) {
    fileStatus = DiffFileStatus.Added;
  } else if (newCommit.fileDeleted) {
    fileStatus = DiffFileStatus.Deleted;
  } else if (oldCommit.filePath === newCommit.filePath) {
    fileStatus = DiffFileStatus.Modified;
  } else {
    fileStatus = calculateFileStatusRenamedOrMoved(
      oldCommit.filePath,
      newCommit.filePath
    );
  }

  const diffNumstatResult = await git.diffSummary(numstatArguments);

  if (
    // If the file contents in some two commits are the same, there won't be any git diff output, even if they have different names, so we can't determine exclusively from the diff command output if some file is a binary or not. No diff flag exists that can be passed to fix this.
    diffNumstatResult.files.length === 0 &&
    // If the file wasn't renamed, added or deleted, the file is exactly the same in the two commits and there is no new version.
    fileStatus === DiffFileStatus.Modified
  ) {
    return undefined;
  }

  const textDiffStats =
    // If diff result shows no changes, there will be no entries in files array, so in that case, this will assign empty stats to textDiffStats instead of undefined
    diffNumstatResult.files.at(0)?.binary === true
      ? undefined
      : {
          baseStats: {
            additions: newCommit.fileDeleted
              ? diffNumstatResult.deletions
              : diffNumstatResult.insertions,
            deletions: newCommit.fileDeleted
              ? diffNumstatResult.insertions
              : diffNumstatResult.deletions
          }
        };
  const fileEntry = new FileChangelogEntry({
    commitHash: newCommit.hash,
    fromPathGitRelative: oldCommit?.filePath,
    pathGitRelative: newCommit.filePath, // Passing oldCommit.filePath or undefined for fileDeleted case could be more logical, but not compatible with use in git commands.
    status: fileStatus,
    textDiffStats,
    timeZoneAdjustedDate: newCommit.timeZoneAdjustedDate
  });
  return fileEntry;
}
