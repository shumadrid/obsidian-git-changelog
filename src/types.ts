import type { EventRef } from 'obsidian';
import type { Spacetime } from 'spacetime';

export class GitPluginIncompatibleVersionError extends Error {
  public constructor() {
    super("Current Git plugin version isn't compatible with this plugin.");
    this.name = 'GitPluginIncompatibleVersionError';
  }
}

export class GitPluginMissingError extends Error {
  public constructor() {
    super("Git plugin isn't enabled.");
    this.name = 'GitPluginMissingError';
  }
}

export class GitRepoMissingError extends Error {
  public constructor() {
    super('Git repository is not initialized or is in an irregular state.');
    this.name = 'GitRepoMissingError';
  }
}

export class AbortError extends Error {
  public constructor() {
    super('Task aborted');
    this.name = 'AbortError';
  }
}

declare module 'obsidian' {
  interface Workspace {
    on(
      name:
        | 'obsidian-git-changelog:active-file-changed'
        | 'obsidian-git-changelog:file-changelog-generation-settings-changed'
        | 'obsidian-git-changelog:generation-settings-changed'
        | 'obsidian-git-changelog:status-bar-settings-changed'
        | 'obsidian-git-changelog:vault-changelog-generation-settings-changed',
      callback: () => void,
      context?: unknown
    ): EventRef;

    // BUG:? Read directly from settings instead of passing as arguments?
    trigger(
      name:
        | 'obsidian-git-changelog:active-file-changed'
        | 'obsidian-git-changelog:file-changelog-generation-settings-changed'
        | 'obsidian-git-changelog:generation-settings-changed'
        | 'obsidian-git-changelog:status-bar-settings-changed'
        | 'obsidian-git-changelog:vault-changelog-generation-settings-changed'
    ): void;
  }
}

export enum ChangelogInterval {
  Daily = 'day',
  Hourly = 'hour',
  Monthly = 'month',
  Weekly = 'week'
}

export enum DiffAlgorithm {
  Default = 'Default', // Myers algorithm
  Inherit = 'Inherit',
  Minimal = 'Minimal'
}

/**
 * "T  : file type changed" are treated as renames.
 * No ETA for detecting "C  : copied" yet.
 */
export enum DiffFileStatus {
  Added = 'A',
  Deleted = 'D',
  Modified = 'M', // Only if not renamed/moved
  // Custom statuses
  Moved = 'F',
  Renamed = 'R',
  RenamedAndMoved = 'RF'
}

export enum DiffMeasurementUnit {
  Lines = 'Lines',
  Words = 'Words'
}

export enum FileExplorerStats {
  Disabled = 'Disabled',
  Folders = 'Folders',
  FoldersAndNotes = 'FoldersAndNotes'
}

export enum FilesSummariesDisplayMode {
  TextAndBinary = 'Text And Binary',
  Total = 'Total'
  // Binary = "Binary",
}

export enum GitPluginState {
  Uninitialized,
  IncompatibleVersion,
  UntestedVersion,
  Enabled
}

export enum OnFileClick {
  OpenFile = 'Open',
  ShowDiff = 'Diff'
}
export interface DiffFile {
  fromPathGitRelative?: string; // Only for renamed files
  pathGitRelative: string;
  // BlobHash: string;
  status: DiffFileStatus;
  textDiffStats?: TextDiffStats; // Keep undefined if the file is binary
}

export interface FileLogEntry extends LogEntry {
  filePath: NonNullable<LogEntry['filePath']>;
}
export interface FilesSummary {
  addedFiles: number;
  deletedFiles: number;
  modifiedFiles: number;
  renamedFiles: number;
}

export interface LogEntry {
  // For file git logs only, to track file renames through history
  filePath?: string;
  hash: string;
  timezoneAdjustedDate: Spacetime;
}

export interface StatEntry {
  count: number;
  icon: string;
  type:
    | 'Additions'
    | 'Deletions'
    | 'Incoming Moves'
    | 'Internal Moves'
    | 'Outgoing Moves';
}

export interface TextDiffBaseStats {
  additions: number;
  deletions: number;
}

export interface TextDiffFile extends DiffFile {
  textDiffStats: NonNullable<DiffFile['textDiffStats']>;
}

export interface TextDiffMoveStats {
  incomingMoves: number;
  internalMoves: number;
  outgoingMoves: number;
}

export interface TextDiffStats {
  baseStats: TextDiffBaseStats;
  moveStats?: TextDiffMoveStats;
}
