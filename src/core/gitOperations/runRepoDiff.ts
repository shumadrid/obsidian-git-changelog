/* eslint-disable no-magic-numbers */
import type GitChangelogPlugin from 'main.ts';
import type { DiffFile, FilesSummary, LogEntry, TextDiffFile } from 'types.ts';

import { VaultChangelogEntry } from 'core/ChangelogEntry.svelte.ts';
import {
  addFileStatusToSummary,
  assignDiffAlgorithm,
  calculateFileStatusRenamedOrMoved
} from 'core/gitOperations/helper.ts';
import { convertGitIgnoreToPathspec } from 'settings/ui/GitDiffIgnore.ts';
import { getRenameLimit } from 'settings/ui/RenameDetectionFileLimit.ts';
import { getRenameDetectionSensitivity } from 'settings/ui/RenameDetectionSensitivitySlider.ts';
import { AbortError, DiffFileStatus } from 'types.ts';
import { insertSorted, parseContentChange } from 'utils.ts';

import { runRepoDiffStatus } from './runRepoDiffStatus.ts';

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
  if (oldCommit === undefined) {
    return new VaultChangelogEntry({
      binaryFiles: [],
      binaryFilesSummaryCached: {
        addedFiles: 0,
        deletedFiles: 0,
        modifiedFiles: 0,
        renamedFiles: 0
      },
      commitHash: newCommit.hash,
      textFiles: [],
      textFilesSummaryCached: {
        addedFiles: 0,
        deletedFiles: 0,
        modifiedFiles: 0,
        renamedFiles: 0
      },
      timezoneAdjustedDate: newCommit.timezoneAdjustedDate
    });
  }
  const pathSpec = convertGitIgnoreToPathspec(plugin);
  if (newCommit === undefined) {
    plugin.consoleDebug('newCommit is undefined');
  }

  if (abortSignal.aborted) {
    throw new AbortError();
  }

  const statusResult = await runRepoDiffStatus({
    newCommit: newCommit.hash,
    oldCommit: oldCommit.hash,
    pathSpec,
    plugin
  });

  const numstatArguments = [
    '--numstat',
    `-l${getRenameLimit(plugin.settings.changelogGenerationSettings)}`,
    `--find-renames=${getRenameDetectionSensitivity(plugin.settings.changelogGenerationSettings)}%`,
    '--color-moved=no',
    '--no-rename-empty',
    '-z'
  ];
  assignDiffAlgorithm(numstatArguments, plugin);

  numstatArguments.push(oldCommit.hash, newCommit.hash);

  if (pathSpec.length > 0) {
    numstatArguments.push('--', ...pathSpec);
  }
  if (abortSignal.aborted) {
    throw new AbortError();
  }
  const git = await plugin.getGit();
  const diffNumstatResult = await git.diff(numstatArguments);

  const records = diffNumstatResult.split('\0').filter((token) => token !== '');

  if (records.length === 0) {
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

  let index = 0;

  while (index < records.length) {
    // The header token always contains the added/deleted counts.
    const header = records[index++];
    const parts = header.split('\t');
    const addedString = parts[0];
    const deletedString = parts[1];
    let filePath: string;
    let oldPath: string | undefined = undefined;

    if (parts.length === 3 && parts[2] !== '') {
      // Simple case: a single file record.
      filePath = parts[2];
    } else {
      // Renamed file case:
      // The header ends with an empty field, so we expect two additional tokens:
      // First token: the preImage path, second token: the postImage path.
      const preImage = records[index++];
      const postImage = records[index++];
      oldPath = preImage;
      filePath = postImage;
    }

    // Determine if this is a binary file or submodule.
    const isBinary = addedString === '-' && deletedString === '-';

    // Get the file change status from the "git status" results (defaulting to Modified).
    let status: DiffFileStatus;
    if (oldCommit === undefined) {
      status = DiffFileStatus.Added;
    } else if (oldPath) {
      if (typeof oldPath !== 'string') {
        plugin.consoleDebug('oldPath is not a string!', oldPath);
      }
      status = calculateFileStatusRenamedOrMoved(oldPath, filePath);
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    } else if (statusResult![filePath]) {
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      status = statusResult![filePath];
    } else {
      status = DiffFileStatus.Modified;
    }

    // Update counters based on file type (binary vs text) and status.
    if (isBinary) {
      addFileStatusToSummary(status, binaryFilesSummary);
    } else {
      addFileStatusToSummary(status, textFilesSummary);
    }

    // Parse numeric values for text files.
    const textDiffStats = isBinary
      ? undefined
      : parseContentChange({
          addedStr: addedString,
          deletedStr: deletedString
        });

    const file: DiffFile = {
      fromPathGitRelative: oldPath,
      pathGitRelative: filePath,
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
    previousDayLastCommitHash: oldCommit.hash,
    textFiles,
    textFilesSummaryCached: textFilesSummary,
    timezoneAdjustedDate: newCommit.timezoneAdjustedDate
  });

  return dayEntry;
}
