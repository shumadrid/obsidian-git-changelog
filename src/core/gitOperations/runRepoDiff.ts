/* eslint-disable no-magic-numbers */
import type GitChangelogPlugin from 'main.ts';
import type {
  DiffFile,
  FilesSummary,
  LogEntry,
  TextDiffFile,
  TextDiffStats
} from 'types.ts';

import { VaultChangelogEntry } from 'core/ChangelogEntry.svelte.ts';
import { getEmptyTreeHash } from 'core/gitOperations/getEmptyTreeHash.ts';
import {
  addFileStatusToSummary,
  assignDiffAlgorithm,
  calculateFileStatusRenamedOrMoved
} from 'core/gitOperations/helper.ts';
import { runRepoDiffStatus } from 'core/gitOperations/runRepoDiffStatus.ts';
import { convertGitIgnoreToPathspec } from 'settings/ui/ExcludeFilesAndFolders.ts';
import { getRenameLimit } from 'settings/ui/RenameDetectionFileLimit.ts';
import { getRenameDetectionSensitivity } from 'settings/ui/RenameDetectionSensitivitySlider.ts';
import { AbortError, DiffFileStatus } from 'types.ts';
import { insertSorted } from 'utils.ts';

export function compareBinaryFiles(
  leftFile: DiffFile,
  rightFile: DiffFile
): number {
  const statusOrder = {
    [DiffFileStatus.Added]: 3,
    [DiffFileStatus.Deleted]: 1,
    [DiffFileStatus.Modified]: 2,
    [DiffFileStatus.Moved]: 5,
    [DiffFileStatus.Renamed]: 6,
    [DiffFileStatus.RenamedAndMoved]: 4
  };
  const aStatusOrder = statusOrder[leftFile.status] || 7;
  const bStatusOrder = statusOrder[rightFile.status] || 7;
  if (aStatusOrder !== bStatusOrder) {
    return aStatusOrder - bStatusOrder;
  }
  return leftFile.pathGitRelative.localeCompare(rightFile.pathGitRelative);
}

export function compareTextFiles(
  leftFile: TextDiffFile,
  rightFile: TextDiffFile
): number {
  const aChanges =
    (leftFile.textDiffStats.baseStats.additions || 0) +
    (leftFile.textDiffStats.baseStats.deletions || 0);
  const bChanges =
    (rightFile.textDiffStats.baseStats.additions || 0) +
    (rightFile.textDiffStats.baseStats.deletions || 0);
  if (bChanges !== aChanges) {
    return bChanges - aChanges;
  }
  return leftFile.pathGitRelative.localeCompare(rightFile.pathGitRelative);
}

export async function runRepoDiff({
  abortSignal,
  newCommit,
  oldCommit,
  plugin
}: {
  abortSignal: AbortSignal;
  newCommit: LogEntry;
  oldCommit?: LogEntry;
  plugin: GitChangelogPlugin;
}): Promise<undefined | VaultChangelogEntry> {
  if (newCommit === undefined) {
    plugin.consoleDebug('newCommit is undefined');
  }

  if (abortSignal.aborted) {
    throw new AbortError();
  }

  const pathSpec = convertGitIgnoreToPathspec(plugin);

  const numstatArguments = [
    '--numstat',
    `-l${getRenameLimit(plugin.settings.changelogGenerationSettings)}`,
    `--find-renames=${getRenameDetectionSensitivity(plugin.settings.changelogGenerationSettings)}%`,
    '--color-moved=no',
    '--no-rename-empty'
  ];
  assignDiffAlgorithm(numstatArguments, plugin);

  let statusResult: Record<string, DiffFileStatus> | undefined;

  if (oldCommit === undefined) {
    const emptyTreeHash = await getEmptyTreeHash({ plugin });
    numstatArguments.push(emptyTreeHash, newCommit.hash);
  } else {
    statusResult = await runRepoDiffStatus({
      newCommit: newCommit.hash,
      oldCommit: oldCommit.hash,
      pathSpec,
      plugin
    });
    numstatArguments.push(oldCommit.hash, newCommit.hash);
  }

  if (pathSpec.length > 0) {
    numstatArguments.push('--', ...pathSpec);
  }

  if (abortSignal.aborted) {
    throw new AbortError();
  }
  const git = await plugin.getGit();
  const diffNumstatResult = await git.diffSummary(numstatArguments);

  if (diffNumstatResult.files.length === 0) {
    return undefined;
  }

  const textFilesSummary: FilesSummary = {
    addedFiles: 0,
    deletedFiles: 0,
    modifiedFiles: 0,
    renamedFiles: 0
  };
  const binaryFilesSummary: FilesSummary = {
    addedFiles: 0,
    deletedFiles: 0,
    modifiedFiles: 0,
    renamedFiles: 0
  };

  const textFiles: DiffFile[] = [];
  const binaryFiles: DiffFile[] = [];

  for (const logFile of diffNumstatResult.files) {
    // Get the file change status from the "git status" results (defaulting to Modified).
    let status: DiffFileStatus;
    if (oldCommit === undefined) {
      status = DiffFileStatus.Added;
    } else if (logFile) {
      status = calculateFileStatusRenamedOrMoved(logFile.from, logFile.file);
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    } else if (statusResult![logFile.file]) {
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      status = statusResult![logFile.file];
    } else {
      status = DiffFileStatus.Modified;
    }

    // Update counters based on file type (binary vs text) and status.
    if (logFile.binary) {
      addFileStatusToSummary(status, binaryFilesSummary);
    } else {
      addFileStatusToSummary(status, textFilesSummary);
    }

    // Parse numeric values for text files.
    const textDiffStats: TextDiffStats | undefined = logFile.binary
      ? undefined
      : {
          baseStats: {
            additions: logFile.insertions,
            deletions: logFile.deletions
          }
        };

    const file: DiffFile = {
      fromPathGitRelative: logFile.from,
      pathGitRelative: logFile.file,
      status,
      textDiffStats
    };
    if (file.textDiffStats) {
      insertSorted(textFiles, file, compareTextFiles);
    } else {
      insertSorted(binaryFiles, file, compareBinaryFiles);
    }
  }

  const dayEntry = new VaultChangelogEntry({
    binaryFiles,
    binaryFilesSummaryCached: binaryFilesSummary,
    commitHash: newCommit.hash,
    previousDayLastCommitHash: oldCommit?.hash,
    textFiles,
    textFilesSummaryCached: textFilesSummary,
    timezoneAdjustedDate: newCommit.timezoneAdjustedDate
  });

  return dayEntry;
}
