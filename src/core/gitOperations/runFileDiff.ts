import type GitChangelogPlugin from 'main.ts';
import type { FileLogEntry } from 'types.ts';

import { FileChangelogEntry } from 'core/ChangelogEntry.svelte.ts';
import { getEmptyTreeHash } from 'core/gitOperations/getEmptyTreeHash.ts';
import {
  assignDiffAlgorithm,
  calculateFileStatusRenamedOrMoved
} from 'core/gitOperations/helper.ts';
import { AbortError, DiffFileStatus } from 'types.ts';
import { parseContentChange } from 'utils.ts';

export async function runFileDiff({
  abortSignal,
  newCommit,
  oldCommit,
  plugin
}: {
  abortSignal: AbortSignal;
  newCommit: FileLogEntry;
  oldCommit?: FileLogEntry;
  plugin: GitChangelogPlugin;
}): Promise<FileChangelogEntry | undefined> {
  const isInitialVersion =
    oldCommit === undefined || oldCommit.fileDeleted === true;

  if (isInitialVersion && newCommit.fileDeleted) {
    // I assumed that the other should always be defined if one is undefined, since newCommit.hash is only undefined for commits where the file was deleted, and it can't get deleted if it didn't exist before, but these are statuses calculated from comparing neighboring commits, but we are diffing selected commits only, so maybe it's possible that we get in a situation where we compare some initial version commit (that isn't the actual initial commit, so that commit could be a deletion of that file, if a file was newly added and then deleted in the same interval) with an empty state
    plugin.consoleDebug(
      'oldCommit and newCommit are both undefined, assumption is wrong'
    );

    return undefined;
  }

  let fileStatus: DiffFileStatus;

  if (isInitialVersion) {
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

  const numstatArguments = [
    '--numstat',
    '--color-moved=no',
    '-z',
    '--no-renames'
    // `--exit-code`,
  ];

  assignDiffAlgorithm(numstatArguments, plugin);

  // Only one of these can be true at the same time since we are returning early if they are both true.
  if (isInitialVersion || newCommit.fileDeleted) {
    const emptyTreeHash = await getEmptyTreeHash({ plugin });

    numstatArguments.push(
      emptyTreeHash,
      isInitialVersion ? newCommit.hash : oldCommit.hash,
      // This part is important. It tells git where is the explicit separation between revisions and the file path. Without it, git will not always be able to parse the file path correctly.
      '--',
      // We can pass oldCommit.filePath if the new commit is just a deletion of that file, meaning the file names are the same. We just inverse the result later to count the showed additions as deletions.

      isInitialVersion ? newCommit.filePath : oldCommit.filePath
    );
  } else {
    numstatArguments.push(
      `${oldCommit.hash}:${oldCommit.filePath}`,
      `${newCommit.hash}:${newCommit.filePath}`
    );
  }

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
    : parseContentChange({
        addedStr: newCommit.fileDeleted ? deletedString : addedString,
        deletedStr: newCommit.fileDeleted ? addedString : deletedString
      });
  const fileEntry = new FileChangelogEntry({
    commitHash: newCommit.hash,
    fromPathGitRelative: oldCommit?.filePath,
    pathGitRelative: newCommit.filePath, // Passing oldCommit.filePath or undefined for fileDeleted case could be more logical, but not compatible with use in git commands.
    status: fileStatus,
    textDiffStats,
    timezoneAdjustedDate: newCommit.timezoneAdjustedDate
  });
  return fileEntry;
}
