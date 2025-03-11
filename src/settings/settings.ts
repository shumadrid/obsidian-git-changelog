/* eslint-disable no-magic-numbers */
import { PluginSettingsBase } from 'obsidian-dev-utils/obsidian/Plugin/PluginSettingsBase';
import spacetime from 'spacetime';
import {
  ChangelogInterval,
  DiffAlgorithm,
  DiffMeasurementUnit,
  FileExplorerStats,
  FilesSummariesDisplayMode
} from 'types.ts';

// Constants
export const TIME_ZONES_LIST = new Set(Object.keys(spacetime().timezones));
export const MAX_SUPPORTED_INTERVAL = 99_999; // ~69 days
export const AUTO_DETECT_TIMEZONE_PLACEHOLDER = 'Auto-detect';

/**
 * Each change in these settings triggers a recalculation of the changelogs statistics.
 */
export interface ChangelogGenerationSettings {
  // Time settings
  dayStartTime: number;
  // Diff settings
  detectMovedContent: boolean;
  diffAlgorithm: DiffAlgorithm;
  gitDiffIgnore: string;
  measurementUnit: DiffMeasurementUnit;
  renameDetectionSensitivity: number;
  renameLimit: string;
  timezone: string;
}

export interface IGitChangelogSettings {
  autoCommitDisabledWarningDismissed: boolean;
  changelogGenerationSettings: ChangelogGenerationSettings;
  contentDeletionsAndMovesWarningThreshold: string;
  dedicatedFileTypeSummaries: string[];
  fileChangelogInterval: ChangelogInterval;
  fileExplorerInterval: string;
  fileExplorerStats: FileExplorerStats;
  filesChangesWarningThreshold: string;
  fileSummariesDisplayMode: FilesSummariesDisplayMode;
  locale: string;
  notifyOnContentDeletionsAndMovesThresholdReached: boolean;
  notifyOnFilesChangesThresholdReached: boolean;
  statusBarInterval: string;
  statusBarStats: boolean;
  vaultChangelogInterval: ChangelogInterval;
}

export class GitChangelogPluginSettings extends PluginSettingsBase {
  // State
  public autoCommitDisabledWarningDismissed: boolean =
    DEFAULT_SETTINGS.autoCommitDisabledWarningDismissed;

  public changelogGenerationSettings: ChangelogGenerationSettings =
    DEFAULT_CHANGELOG_GENERATION_SETTINGS;

  /**
   * The number refers to either words or lines depending on what the changelog is set up to count
   */
  public contentDeletionsAndMovesWarningThreshold: string =
    DEFAULT_SETTINGS.contentDeletionsAndMovesWarningThreshold;

  // ShowFilesSummaryCountOptions[]; //Set<ShowFilesSummaryCountOptions>;
  // VaultChangelogFilesVisibility: VaultChangelogFilesVisibility;
  // NotifyOnLargeCommitAdditions: boolean;
  // NotifyOnLargeCommitAdditionsWarningThreshold: string;
  public dedicatedFileTypeSummaries: string[] = [
    ...DEFAULT_SETTINGS.dedicatedFileTypeSummaries
  ];

  public fileChangelogInterval: ChangelogInterval =
    DEFAULT_SETTINGS.fileChangelogInterval;

  public fileExplorerInterval: string = DEFAULT_SETTINGS.fileExplorerInterval;
  public fileExplorerStats: FileExplorerStats =
    DEFAULT_SETTINGS.fileExplorerStats;

  public filesChangesWarningThreshold: string =
    DEFAULT_SETTINGS.filesChangesWarningThreshold;

  public fileSummariesDisplayMode: FilesSummariesDisplayMode =
    DEFAULT_SETTINGS.fileSummariesDisplayMode;

  public locale: string = DEFAULT_SETTINGS.locale;
  public notifyOnContentDeletionsAndMovesThresholdReached: boolean =
    DEFAULT_SETTINGS.notifyOnContentDeletionsAndMovesThresholdReached;

  public notifyOnFilesChangesThresholdReached: boolean =
    DEFAULT_SETTINGS.notifyOnFilesChangesThresholdReached;

  public statusBarInterval: string = DEFAULT_SETTINGS.statusBarInterval;
  public statusBarStats: boolean = DEFAULT_SETTINGS.statusBarStats;
  // Specific Changelog Generation Settings
  public vaultChangelogInterval: ChangelogInterval =
    DEFAULT_SETTINGS.vaultChangelogInterval;

  public constructor(data: unknown) {
    super();
    // Object.assign(this, DEFAULT_SETTINGS);
    this.init(data);
    this._shouldSaveAfterLoad = true;
  }
}

export const DEFAULT_CHANGELOG_GENERATION_SETTINGS: ChangelogGenerationSettings =
  {
    dayStartTime: 0,
    detectMovedContent: true,
    diffAlgorithm: DiffAlgorithm.Inherit,
    gitDiffIgnore: '',
    measurementUnit: DiffMeasurementUnit.Words,
    renameDetectionSensitivity: 50,
    renameLimit: '1000',
    timezone: AUTO_DETECT_TIMEZONE_PLACEHOLDER
  } as const;
export const DEFAULT_SETTINGS: IGitChangelogSettings = {
  autoCommitDisabledWarningDismissed: false,
  changelogGenerationSettings: DEFAULT_CHANGELOG_GENERATION_SETTINGS,
  contentDeletionsAndMovesWarningThreshold: '2000',
  dedicatedFileTypeSummaries: [] as const,
  fileChangelogInterval: ChangelogInterval.Daily,
  fileExplorerInterval: '4320', // In mins
  fileExplorerStats: FileExplorerStats.Disabled,
  filesChangesWarningThreshold: '50',
  fileSummariesDisplayMode: FilesSummariesDisplayMode.Total,
  locale: '',
  notifyOnContentDeletionsAndMovesThresholdReached: true,
  notifyOnFilesChangesThresholdReached: false,
  statusBarInterval: '30', // In mins
  statusBarStats: false,
  vaultChangelogInterval: ChangelogInterval.Daily
} as const;
