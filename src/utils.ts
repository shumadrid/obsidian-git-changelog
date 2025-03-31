/* eslint-disable unicorn/prevent-abbreviations */
import type { App, WorkspaceLeaf } from 'obsidian';
import type { DiffFile, TextDiffStats } from 'types.ts';

// Import * as cssColorConverter from "css-color-converter";
import { Keymap } from 'obsidian';
import { DiffFileStatus, NullValueError } from 'types.ts';

export function getFileNameFromPath({
  normalizedFilePath
}: {
  normalizedFilePath: string;
}): string {
  return normalizedFilePath.split('/').pop() ?? '';
}

export function getNewLeaf(
  app: App,
  event?: MouseEvent
): undefined | WorkspaceLeaf {
  let leaf: undefined | WorkspaceLeaf;
  if (event) {
    if (event.button === 0 || event.button === 1) {
      const type = Keymap.isModEvent(event);
      leaf = app.workspace.getLeaf(type);
    }
  } else {
    leaf = app.workspace.getLeaf(false);
  }
  return leaf;
}

export function insertSorted<T>(
  array: T[],
  value: T,
  compareFunction: (a: T, b: T) => number
): void {
  let left = 0;
  let right = array.length;

  while (left < right) {
    const mid = Math.floor((left + right) / 2);
    if (compareFunction(array[mid], value) < 0) {
      left = mid + 1;
    } else {
      right = mid;
    }
  }

  array.splice(left, 0, value); // Insert at the correct position
}

export function isMoved(file: DiffFile): boolean {
  return (
    file.status === DiffFileStatus.Moved ||
    file.status === DiffFileStatus.RenamedAndMoved
  );
}

export function isRenamed(file: DiffFile): boolean {
  return (
    file.status === DiffFileStatus.Renamed ||
    file.status === DiffFileStatus.RenamedAndMoved
  );
}

export function parseContentChange({
  addedStr,
  deletedStr
}: {
  addedStr: string;
  deletedStr: string;
}): TextDiffStats {
  let added = Number.parseInt(addedStr, 10);
  if (Number.isNaN(added)) {
    added = 0;
  }

  let deleted = Number.parseInt(deletedStr, 10);
  if (Number.isNaN(deleted)) {
    // ConsoleLog(
    //     `Failed to parse deleted lines: ${deletedStr}  from ${filePath}`
    // );
    deleted = 0;
  }
  const textDiffStats: TextDiffStats = {
    baseStats: { additions: added, deletions: deleted }
  };

  return textDiffStats;
}

export function assertNotNull<T>(value: null | T | undefined): T {
  DEV: if (value === null || value === undefined) {
    console.error('Non-nullable value is null or undefined');
    throw new NullValueError();
  }
  return value;
}
