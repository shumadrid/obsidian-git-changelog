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

export class NullValueError extends Error {
  public constructor() {
    super('Non-nullable value is null or undefined');
    this.name = 'NullValueError';
  }
}

declare module 'obsidian' {
  interface Workspace {
    on(
      name:
        | 'git-changelog:active-git-file-changed'
        | 'git-changelog:file-changelog-generation-settings-changed'
        | 'git-changelog:generation-settings-changed'
        | 'git-changelog:status-bar-settings-changed'
        | 'git-changelog:vault-changelog-generation-settings-changed',
      callback: () => void,
      context?: unknown
    ): EventRef;
    on(
      name: 'git-changelog:menu',
      callback: (
        menu: Menu,
        inFileMenu: boolean,
        gitRelativePath?: string,
        commitHash?: string
      ) => void,
      context?: unknown
    ): EventRef;
    trigger(
      name:
        | 'git-changelog:active-git-file-changed'
        | 'git-changelog:file-changelog-generation-settings-changed'
        | 'git-changelog:generation-settings-changed'
        | 'git-changelog:status-bar-settings-changed'
        | 'git-changelog:vault-changelog-generation-settings-changed'
    ): void;
    trigger(
      name: 'git-changelog:menu',
      menu: Menu,
      // Is the menu standalone, or are it's items added to the existing file menu?
      inFileMenu: boolean,
      gitRelativePath?: string,
      commitHash?: string
    ): void;
    trigger(
      name: 'file-menu',
      menu: Menu,
      file: TAbstractFile,
      source: string,
      leaf?: WorkspaceLeaf
    ): void;
  }
}

export enum ChangelogInterval {
  Daily = 'day',
  Hourly = 'hour',
  Monthly = 'month',
  Weekly = 'week'
}

/**
 * Patience and Histogram algorithms don't make sense for this use case.
 */
export enum DiffAlgorithm {
  Inherit = 'Inherit',
  Default = 'default', // Myers algorithm
  Minimal = 'minimal'
}

export enum WhitespaceIgnoreMode {
  None = 'None',
  SpaceAtEol = 'SpaceAtEol',
  SpaceChange = 'SpaceChange', // Superset of SpaceAtEol
  AllSpace = 'AllSpace' // Superset of SpaceChange
  // None = 'None',
  // Git lacks a `--no-ignore-whitespace` flag.
  // `core.whitespace` is related to fixing whitespace issues, not ignoring whitespace in diffs.
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

export enum FileSummariesDisplayMode {
  TextAndBinary = 'Text and binary',
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
  renamedAndMovedFiles: number;
}

export interface CompareRepoCommitsViewState {
  utcOlderDate: string;
  utcNewerDate: string;
}

export interface LogEntry {
  // Can be null for file logs, if the file was deleted in some commit
  hash: string;
  timeZoneAdjustedDate: Spacetime;

  // For file git logs only:
  // To track file renames through history
  filePath?: string;
  // Covers a deleted edge-case
  fileDeleted?: boolean;
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
