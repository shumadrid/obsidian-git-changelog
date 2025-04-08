import type { Except, ReadonlyDeep } from 'type-fest';

import spacetime from 'spacetime';
import {
  ChangelogInterval,
  DiffAlgorithm,
  DiffMeasurementUnit,
  FileExplorerStats,
  FileSummariesDisplayMode,
  WhitespaceIgnoreMode
} from 'types.ts';

// Constants
// Takes 0.3 ms
export const TIME_ZONES_LIST = new Set(Object.keys(spacetime().timezones));
export const MAX_SUPPORTED_INTERVAL = 99_999; // ~69 days
export const AUTO_DETECT_PLACEHOLDER = 'Auto-detect';

export class GitChangelogSettings {
  // Plugin state
  public autoCommitDisabledWarningDismissed = false;
  public firstStartup = true;

  // ShowFilesSummaryCountOptions[]; //Set<ShowFilesSummaryCountOptions>;
  // VaultChangelogFilesVisibility: VaultChangelogFilesVisibility;
  // NotifyOnLargeCommitAdditions: boolean;
  // NotifyOnLargeCommitAdditionsWarningThreshold: string;
  public dedicatedFileTypeSummaries: string[] = [];
  public fileSummariesDisplayMode: FileSummariesDisplayMode =
    FileSummariesDisplayMode.Total;

  public fileExplorerInterval = '4320'; // In mins
  public fileExplorerStats: FileExplorerStats = FileExplorerStats.Disabled;

  public notifyOnHighContentDeletionsAndMoves = true;
  /**
   * The number refers to either words or lines depending on what the changelog is set up to count
   */
  public contentDeletionsAndMovesWarningThreshold = '2000';

  public notifyOnHighFilesChanged = false;
  public filesChangedWarningThreshold = '50';

  public statusBarInterval = 30; // In mins
  public showStatusBarStats = false;

  // FileGenerationSettings
  public fileChangelogInterval: ChangelogInterval = ChangelogInterval.Daily;

  // VaultGenerationSettings
  public excludeFilesAndFoldersLines: string[] = [];
  public convertToIncludeList = false;
  public vaultChangelogInterval = ChangelogInterval.Daily;

  /**
   * Each change in these settings triggers a recalculation of all the changelogs statistics.
   */
  // Time settings
  public dayStartHour = 0;
  // Diff settings
  public detectMovedContent = true;
  public diffAlgorithm = DiffAlgorithm.Inherit;
  public diffMeasurementUnit = DiffMeasurementUnit.Words;
  public renameDetectionStrictness = 50;
  public renameLimit = 1000;
  public timeZone = AUTO_DETECT_PLACEHOLDER;
  public locale = AUTO_DETECT_PLACEHOLDER;
  public whitespaceIgnoreMode = WhitespaceIgnoreMode.None;
  public ignoreBlankLines = false;
}

// This is needed for checking if the generation settings have changed. And on each new added setting, the developer will have to explicitly include or exclude the added setting from all of these categories.

export function pickVaultChangelogSettings(
  settings: ReadonlyDeep<GitChangelogSettings>
): ReadonlyDeep<VaultGenerationSettings> {
  return {
    excludeFilesAndFoldersLines: settings.excludeFilesAndFoldersLines,
    convertToIncludeList: settings.convertToIncludeList,
    vaultChangelogInterval: settings.vaultChangelogInterval
  };
}

export function pickFileChangelogSettings(
  settings: ReadonlyDeep<GitChangelogSettings>
): ReadonlyDeep<FileGenerationSettings> {
  return {
    fileChangelogInterval: settings.fileChangelogInterval
  };
}

export function pickGeneralChangelogSettings(
  settings: ReadonlyDeep<GitChangelogSettings>
): ReadonlyDeep<GenerationSettings> {
  return {
    dayStartHour: settings.dayStartHour,
    detectMovedContent: settings.detectMovedContent,
    diffAlgorithm: settings.diffAlgorithm,
    diffMeasurementUnit: settings.diffMeasurementUnit,
    renameDetectionStrictness: settings.renameDetectionStrictness,
    renameLimit: settings.renameLimit,
    timeZone: settings.timeZone,
    locale: settings.locale,
    whitespaceIgnoreMode: settings.whitespaceIgnoreMode,
    ignoreBlankLines: settings.ignoreBlankLines
  };
}

type VaultGenerationSettings = Except<
  GitChangelogSettings,
  | 'autoCommitDisabledWarningDismissed'
  | 'contentDeletionsAndMovesWarningThreshold'
  | 'dayStartHour'
  | 'dedicatedFileTypeSummaries'
  | 'detectMovedContent'
  | 'diffAlgorithm'
  | 'diffMeasurementUnit'
  | 'fileChangelogInterval'
  | 'fileExplorerInterval'
  | 'fileExplorerStats'
  | 'filesChangedWarningThreshold'
  | 'fileSummariesDisplayMode'
  | 'firstStartup'
  | 'ignoreBlankLines'
  | 'locale'
  | 'notifyOnHighContentDeletionsAndMoves'
  | 'notifyOnHighFilesChanged'
  | 'renameDetectionStrictness'
  | 'renameLimit'
  | 'showStatusBarStats'
  | 'statusBarInterval'
  | 'timeZone'
  | 'whitespaceIgnoreMode'
>;

type FileGenerationSettings = Except<
  GitChangelogSettings,
  | 'autoCommitDisabledWarningDismissed'
  | 'contentDeletionsAndMovesWarningThreshold'
  | 'convertToIncludeList'
  | 'dayStartHour'
  | 'dedicatedFileTypeSummaries'
  | 'detectMovedContent'
  | 'diffAlgorithm'
  | 'diffMeasurementUnit'
  | 'excludeFilesAndFoldersLines'
  | 'fileExplorerInterval'
  | 'fileExplorerStats'
  | 'filesChangedWarningThreshold'
  | 'fileSummariesDisplayMode'
  | 'firstStartup'
  | 'ignoreBlankLines'
  | 'locale'
  | 'notifyOnHighContentDeletionsAndMoves'
  | 'notifyOnHighFilesChanged'
  | 'renameDetectionStrictness'
  | 'renameLimit'
  | 'showStatusBarStats'
  | 'statusBarInterval'
  | 'timeZone'
  | 'vaultChangelogInterval'
  | 'whitespaceIgnoreMode'
>;

type GenerationSettings = Except<
  GitChangelogSettings,
  | 'autoCommitDisabledWarningDismissed'
  | 'contentDeletionsAndMovesWarningThreshold'
  | 'convertToIncludeList'
  | 'dedicatedFileTypeSummaries'
  | 'excludeFilesAndFoldersLines'
  | 'fileChangelogInterval'
  | 'fileExplorerInterval'
  | 'fileExplorerStats'
  | 'filesChangedWarningThreshold'
  | 'fileSummariesDisplayMode'
  | 'firstStartup'
  | 'notifyOnHighContentDeletionsAndMoves'
  | 'notifyOnHighFilesChanged'
  | 'showStatusBarStats'
  | 'statusBarInterval'
  | 'vaultChangelogInterval'
>;
