import type { GitChangelogPluginTypes } from 'constants.ts';
import type { MaybeReturn } from 'obsidian-dev-utils/Type';

import {
  MAX_RENAME_DETECTION_STRICTNESS,
  MIN_RENAME_DETECTION_STRICTNESS
} from 'constants.ts';
import { PluginSettingsManagerBase } from 'obsidian-dev-utils/obsidian/Plugin/PluginSettingsManagerBase';
import {
  GitChangelogSettings,
  MAX_SUPPORTED_INTERVAL
} from 'settings/settings.ts';
import { validateLocale } from 'settings/ui/CustomLocale.ts';
import { validateCustomTimeZone } from 'settings/ui/CustomTimeZone.ts';
import {
  ChangelogInterval,
  DiffAlgorithm,
  DiffMeasurementUnit,
  FileExplorerStats,
  WhitespaceIgnoreMode
} from 'types.ts';

export class GitChangelogSettingsManager extends PluginSettingsManagerBase<GitChangelogPluginTypes> {
  // eslint-disable-next-line @typescript-eslint/require-await
  protected override async onLoadRecord(
    record: Record<string, unknown>
  ): Promise<void> {
    // Only migrate if this is legacy data - check for the existence of the old settings structure
    if ('vaultChangelogGenerationSettings' in record) {
      // Check if the legacy excludeFilesAndFoldersLines data exists
      const vaultSettings = record.vaultChangelogGenerationSettings as
        | Record<string, unknown>
        | undefined;
      const legacyExcludeLines = vaultSettings?.excludeFilesAndFoldersLines;

      // Check if we need to migrate (legacy data exists)
      if (
        legacyExcludeLines &&
        Array.isArray(legacyExcludeLines) &&
        legacyExcludeLines.length > 0 &&
        (record.excludeFilesAndFoldersLines === undefined ||
          record.excludeFilesAndFoldersLines === null ||
          !Array.isArray(record.excludeFilesAndFoldersLines) ||
          record.excludeFilesAndFoldersLines.length === 0)
      ) {
        // Migrate the data
        record.excludeFilesAndFoldersLines = legacyExcludeLines;
        // Remove the old settings structure to prevent future migrations
        delete record.vaultChangelogGenerationSettings;
      }
    }
  }

  protected override createDefaultSettings(): GitChangelogSettings {
    return new GitChangelogSettings();
  }

  protected override registerValidators(): void {
    super.registerValidators();
    this.registerValidator(
      'diffMeasurementUnit',
      (measurementUnit): MaybeReturn<string> => {
        if (!Object.values(DiffMeasurementUnit).includes(measurementUnit)) {
          return 'Invalid measurement unit';
        }
      }
    );

    this.registerValidator(
      'contentDeletionsAndMovesWarningThreshold',
      (contentDeletionsAndMovesWarningThreshold): MaybeReturn<string> => {
        if (
          !Number.isInteger(Number(contentDeletionsAndMovesWarningThreshold)) ||
          Number(contentDeletionsAndMovesWarningThreshold) < 1
        ) {
          return 'Invalid threshold value';
        }
      }
    );

    this.registerValidator('locale', (locale): MaybeReturn<string> => {
      if (
        !validateLocale(locale) &&
        locale !== this.getProperty('locale').defaultValue
      ) {
        return 'Invalid locale';
      }
    });

    this.registerValidator('timeZone', (timeZone): MaybeReturn<string> => {
      if (
        !validateCustomTimeZone(timeZone) &&
        timeZone !== this.getProperty('timeZone').defaultValue
      ) {
        return 'Invalid timeZone';
      }
    });

    const ONE_DAY_IN_HOURS = 24;

    this.registerValidator(
      'dayStartHour',
      (dayStartHour): MaybeReturn<string> => {
        if (
          !Number.isInteger(dayStartHour) ||
          dayStartHour < 0 ||
          dayStartHour >= ONE_DAY_IN_HOURS
        ) {
          return 'Invalid day start time';
        }
      }
    );

    this.registerValidator(
      'diffAlgorithm',
      (diffAlgorithm): MaybeReturn<string> => {
        if (!Object.values(DiffAlgorithm).includes(diffAlgorithm)) {
          return 'Invalid diff algorithm';
        }
      }
    );

    this.registerValidator(
      'filesChangesWarningThreshold',
      (filesChangesWarningThreshold): MaybeReturn<string> => {
        if (
          !Number.isInteger(Number(filesChangesWarningThreshold)) ||
          Number(filesChangesWarningThreshold) < 1
        ) {
          return 'Invalid threshold value';
        }
      }
    );

    this.registerValidator(
      'fileExplorerStats',
      (fileExplorerStats): MaybeReturn<string> => {
        if (!Object.values(FileExplorerStats).includes(fileExplorerStats)) {
          return 'Invalid option';
        }
      }
    );

    this.registerValidator(
      'fileExplorerInterval',
      (fileExplorerInterval): MaybeReturn<string> => {
        if (
          !Number.isInteger(Number(fileExplorerInterval)) ||
          Number(fileExplorerInterval) < 1 ||
          Number(fileExplorerInterval) > MAX_SUPPORTED_INTERVAL
        ) {
          return 'Invalid file explorer interval';
        }
      }
    );

    this.registerValidator(
      'renameLimit',
      (renameLimit): MaybeReturn<string> => {
        if (
          !(
            Number.isInteger(renameLimit) &&
            Number(renameLimit) >= 0 &&
            // eslint-disable-next-line no-magic-numbers
            Number(renameLimit) <= 99_999_999_999_999_999_999n
          )
        ) {
          return 'Invalid rename limit';
        }
      }
    );

    this.registerValidator(
      'renameDetectionStrictness',
      (renameDetectionStrictness): MaybeReturn<string> => {
        if (
          !Number.isInteger(renameDetectionStrictness) ||
          renameDetectionStrictness < MIN_RENAME_DETECTION_STRICTNESS ||
          renameDetectionStrictness > MAX_RENAME_DETECTION_STRICTNESS
        ) {
          return 'Invalid rename detection strictness';
        }
      }
    );

    this.registerValidator(
      'statusBarInterval',
      (statusBarInterval): MaybeReturn<string> => {
        if (
          !Number.isInteger(Number(statusBarInterval)) ||
          Number(statusBarInterval) < 1 ||
          Number(statusBarInterval) > MAX_SUPPORTED_INTERVAL
        ) {
          return 'Invalid status bar interval';
        }
      }
    );

    this.registerValidator(
      'whitespaceIgnoreMode',
      (whitespaceIgnoreMode): MaybeReturn<string> => {
        if (
          !Object.values(WhitespaceIgnoreMode).includes(whitespaceIgnoreMode)
        ) {
          return 'Invalid whitespace ignore mode';
        }
      }
    );

    this.registerValidator(
      'fileChangelogInterval',
      (fileChangelogInterval): MaybeReturn<string> => {
        if (!Object.values(ChangelogInterval).includes(fileChangelogInterval)) {
          return 'Invalid file changelog interval';
        }
      }
    );

    this.registerValidator(
      'vaultChangelogInterval',
      (vaultChangelogInterval): MaybeReturn<string> => {
        if (
          !Object.values(ChangelogInterval).includes(vaultChangelogInterval)
        ) {
          return 'Invalid vault changelog interval';
        }
      }
    );
  }
}
