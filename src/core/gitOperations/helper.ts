import type GitChangelogPlugin from 'main.ts';
import type { DiffFile, FilesSummary } from 'types.ts';

import { normalizePath } from 'obsidian';
import { getDiffAlgorithm } from 'settings/ui/DiffAlgorithmOptions.ts';
import { DiffAlgorithm, DiffFileStatus } from 'types.ts';
import { getFileNameFromPath } from 'utils.ts';
import { getDisplayExtensionFromPath } from 'Views/formatters.ts';

export function addFileStatusToSummary(
  status: DiffFileStatus,
  file: FilesSummary
): void {
  if (status === DiffFileStatus.Added) {
    file.addedFiles++;
  } else if (status === DiffFileStatus.Deleted) {
    file.deletedFiles++;
  } else if (isFileRenamedOrMoved(status)) {
    file.renamedFiles++;
  } else {
    file.modifiedFiles++;
  }
}

export function assignDiffAlgorithm(
  arguments_: string[],
  plugin: GitChangelogPlugin
): void {
  switch (getDiffAlgorithm(plugin.settings.changelogGenerationSettings)) {
    case DiffAlgorithm.Default: {
      arguments_.push('--diff-algorithm=default');
      break;
    }

    case DiffAlgorithm.Minimal: {
      arguments_.push('--diff-algorithm=minimal');
      break;
    }

    default: {
      break;
    }
  }
}

export function calculateFileStatusRenamedOrMoved(
  oldPath: string,
  newPath: string
): DiffFileStatus {
  let status: DiffFileStatus;

  const normalizedOldPath = normalizePath(oldPath);
  const normalizedNewPath = normalizePath(newPath);
  const isMoved = isFileMoved(normalizedOldPath, normalizedNewPath);
  const isRenamed = isFileRenamed(normalizedOldPath, normalizedNewPath);

  if (isRenamed && isMoved) {
    status = DiffFileStatus.RenamedAndMoved;
  } else if (isMoved) {
    status = DiffFileStatus.Moved;
  } else {
    status = DiffFileStatus.Renamed;
  }
  return status;
}

export function calculatePerFileTypeSummaries({
  files
}: {
  files: DiffFile[];
}): Record<string, FilesSummary> {
  const perFileTypeSummaries: Record<string, FilesSummary> = {};

  for (const file of files) {
    // The header token always contains the added/deleted counts.

    const fileType = getDisplayExtensionFromPath(file.pathGitRelative);

    if (!perFileTypeSummaries[fileType]) {
      perFileTypeSummaries[fileType] = {
        addedFiles: 0,
        deletedFiles: 0,
        modifiedFiles: 0,
        renamedFiles: 0
      };
    }

    addFileStatusToSummary(file.status, perFileTypeSummaries[fileType]);
  }
  return perFileTypeSummaries;
}

export function isFileMoved(
  normalizedOldPath: string,
  normalizedNewPath: string
): boolean {
  const normalizedOldPathLastSlashIndex = normalizedOldPath.lastIndexOf('/');
  const normalizedNewPathLastSlashIndex = normalizedNewPath.lastIndexOf('/');
  const oldDirectory = normalizedOldPath.slice(
    0,
    normalizedOldPathLastSlashIndex === -1 ? 0 : normalizedOldPathLastSlashIndex
  );
  const newDirectory = normalizedNewPath.slice(
    0,
    normalizedNewPathLastSlashIndex === -1 ? 0 : normalizedNewPathLastSlashIndex
  );
  return oldDirectory !== newDirectory;
}

export function isFileRenamed(
  normalizedOldPath: string,
  normalizedNewPath: string
): boolean {
  const oldName = getFileNameFromPath({
    normalizedFilePath: normalizedOldPath
  });
  const newName = getFileNameFromPath({
    normalizedFilePath: normalizedNewPath
  });
  return oldName !== newName;
}

export function isFileRenamedOrMoved(file: DiffFileStatus): boolean {
  return (
    file === DiffFileStatus.Moved ||
    file === DiffFileStatus.Renamed ||
    file === DiffFileStatus.RenamedAndMoved
  );
}
