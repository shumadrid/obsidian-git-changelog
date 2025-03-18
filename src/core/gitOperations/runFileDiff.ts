import type GitChangelogPlugin from 'main.ts';
import type { LogEntry } from 'types.ts';

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
  newCommit: LogEntry;
  oldCommit?: LogEntry;
  plugin: GitChangelogPlugin;
}): Promise<FileChangelogEntry> {
  let fileStatus: DiffFileStatus;

  if (oldCommit === undefined) {
    fileStatus = DiffFileStatus.Added;
  } else if (oldCommit.filePath === newCommit.filePath) {
    fileStatus = DiffFileStatus.Modified;
  } else {
    fileStatus = calculateFileStatusRenamedOrMoved(
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      oldCommit.filePath!,
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      newCommit.filePath!
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

  if (oldCommit === undefined) {
    const emptyTreeHash = await getEmptyTreeHash({ plugin });

    numstatArguments.push(
      emptyTreeHash,
      newCommit.hash,
      // This part is important. It tells git where is the explicit separation between revisions and the file path. Without it, git will not always be able to parse the file path correctly.
      '--',
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      newCommit.filePath!
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
        addedStr: addedString,
        deletedStr: deletedString
      });
  const fileEntry = new FileChangelogEntry({
    commitHash: newCommit.hash,
    fromPathGitRelative: oldCommit?.filePath,
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    pathGitRelative: newCommit.filePath!,
    status: fileStatus,
    textDiffStats,
    timezoneAdjustedDate: newCommit.timezoneAdjustedDate
  });
  return fileEntry;
}
