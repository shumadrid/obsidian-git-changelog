/* eslint-disable no-magic-numbers */
import type GitChangelogPlugin from 'main.ts';
import type { SimpleGit } from 'simple-git';
import type {
  DiffAlgorithm,
  DiffFile,
  FilesSummary,
  LogEntry,
  TextDiffFile,
  WhitespaceIgnoreMode
} from 'types.ts';

import { VaultChangelogEntry } from 'core/ChangelogEntry.svelte.ts';
import {
  addFileStatusToSummary,
  assignDiffAlgorithm,
  assignWhitespaceIgnoreSettings,
  calculateFileStatusRenamedOrMoved
} from 'core/gitOperations/helper.ts';
import { convertGitIgnoreToPathspec } from 'settings/ui/ExcludeFilesAndFolders.ts';
import { AbortError, DiffFileStatus } from 'types.ts';
import { assertNotNull, insertSorted, parseContentChange } from 'utils.ts';

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

// eslint-disable-next-line complexity
export async function runRepoDiff({
  abortSignal,
  newCommit,
  oldCommit,
  git,
  plugin,
  excludeFilesAndFoldersLines,
  convertToIncludeList,
  renameLimit,
  renameDetectionStrictness,
  diffAlgorithm,
  whitespaceIgnoreMode,
  ignoreBlankLines,
  emptyTreeHash
}: {
  abortSignal: AbortSignal;
  newCommit: LogEntry;
  oldCommit?: LogEntry;
  diffAlgorithm: DiffAlgorithm;
  git: SimpleGit;
  excludeFilesAndFoldersLines: readonly string[];
  plugin?: GitChangelogPlugin;
  convertToIncludeList: boolean;
  renameLimit: number;
  emptyTreeHash: string;
  renameDetectionStrictness: number;
  ignoreBlankLines: boolean;
  whitespaceIgnoreMode: WhitespaceIgnoreMode;
}): Promise<undefined | VaultChangelogEntry> {
  if (newCommit === undefined) {
    plugin?.consoleDebug('newCommit is undefined');
  }

  if (abortSignal.aborted) {
    throw new AbortError();
  }

  const pathSpec = convertGitIgnoreToPathspec(
    excludeFilesAndFoldersLines,
    convertToIncludeList
  );

  const numstatArguments = [
    '--numstat',
    `-l${renameLimit}`,
    `--find-renames=${renameDetectionStrictness}%`,
    '--color-moved=no',
    // Don't use empty files as rename candidates. If you delete any empty file and add a new empty file, that file will be considered a rename unless this flag is used.
    '--no-rename-empty',
    '-z'
  ];
  assignDiffAlgorithm({ arguments_: numstatArguments, diffAlgorithm });
  assignWhitespaceIgnoreSettings({
    arguments_: numstatArguments,
    whitespaceIgnoreMode,
    ignoreBlankLines
  });

  let statusResult: Record<string, DiffFileStatus> | undefined;

  if (oldCommit === undefined) {
    numstatArguments.push(emptyTreeHash, newCommit.hash);
  } else {
    statusResult = await runRepoDiffStatus({
      newCommit: newCommit.hash,
      oldCommit: oldCommit.hash,
      pathSpec,
      plugin,
      abortSignal,
      git
    });
    numstatArguments.push(oldCommit.hash, newCommit.hash);
  }

  if (pathSpec.length > 0) {
    numstatArguments.push('--', ...pathSpec);
  }

  const diffNumstatResult = await git.diff(numstatArguments);

  if (abortSignal.aborted) {
    throw new AbortError();
  }

  const records = diffNumstatResult.split('\0').filter((token) => token !== '');

  if (records.length === 0) {
    return undefined;
  }

  const textFilesSummary: FilesSummary = {
    addedFiles: 0,
    deletedFiles: 0,
    modifiedFiles: 0,
    renamedAndMovedFiles: 0
  };
  const binaryFilesSummary: FilesSummary = {
    addedFiles: 0,
    deletedFiles: 0,
    modifiedFiles: 0,
    renamedAndMovedFiles: 0
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
        plugin?.consoleDebug('oldPath is not a string', oldPath);
      }
      status = calculateFileStatusRenamedOrMoved(oldPath, filePath);
    } else if (assertNotNull(statusResult)[filePath]) {
      status = assertNotNull(statusResult)[filePath];
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
    previousDayLastCommitHash: oldCommit?.hash,
    textFiles,
    textFilesSummaryCached: textFilesSummary,
    timeZoneAdjustedDate: newCommit.timeZoneAdjustedDate
  });

  return dayEntry;
}
