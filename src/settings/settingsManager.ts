import type { GitChangelogPluginTypes } from 'constants.ts';
import type { MaybeReturn } from 'obsidian-dev-utils/Type';

import {
  MAX_RENAME_DETECTION_STRICTNESS,
  MIN_RENAME_DETECTION_STRICTNESS
} from 'constants.ts';
import { Notice } from 'obsidian';
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

        // We are assuming that the user is updating their plugin version, so we show the "what's changed" notification and alert the user that some of their settings broke.
        const whatsNewFragment = createFragment((element) => {
          element.createEl('p', {
            text: 'Git changelog:\nA new version has been installed.\n\nSome of your settings for this plugin have been reset!'
          });

          element.createEl('button', { text: 'Close' });

          const seeButton = element.createEl('button', { text: "What's new?" });
          seeButton.onClickEvent(() => {
            window.open(
              'https://github.com/shumadrid/obsidian-git-changelog/releases'
            );
          });
          seeButton.addClass('git-changelog-left-padding');
        });
        new Notice(whatsNewFragment, 0);
      }
    }
  }

  protected override createDefaultSettings(): GitChangelogSettings {
    return new GitChangelogSettings();
  }

  protected override registerValidators(): void {
    super.registerValidators();

    // If the active minutes cache is corrupted then just reset it.
    this.registerValidator(
      'activeMinutesPassedSinceLastCheckpoint',
      (activeMinutesPassedSinceLastCheckpoint): MaybeReturn<string> => {
        if (
          !Number.isInteger(activeMinutesPassedSinceLastCheckpoint) ||
          activeMinutesPassedSinceLastCheckpoint < 0
        ) {
          // Reset to 0 if corrupted
          return 'Corrupted value detected. Resetting to 0.';
        }
      }
    );

    this.registerValidator(
      'diffMeasurementUnit',
      (measurementUnit): MaybeReturn<string> => {
        if (!Object.values(DiffMeasurementUnit).includes(measurementUnit)) {
          return 'Choose a valid option.';
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
          return 'Pick a positive whole number.';
        }
      }
    );

    this.registerValidator('locale', (locale): MaybeReturn<string> => {
      if (!validateLocale(locale) && locale !== this.defaultSettings.locale) {
        return 'Invalid locale code.';
      }
    });

    this.registerValidator('timeZone', (timeZone): MaybeReturn<string> => {
      if (
        !validateCustomTimeZone(timeZone) &&
        timeZone !== this.defaultSettings.timeZone
      ) {
        return 'Invalid timezone.';
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
          return 'Invalid time.';
        }
      }
    );

    this.registerValidator(
      'diffAlgorithm',
      (diffAlgorithm): MaybeReturn<string> => {
        if (!Object.values(DiffAlgorithm).includes(diffAlgorithm)) {
          return 'Choose a valid option.';
        }
      }
    );

    this.registerValidator(
      'filesChangedWarningThreshold',
      (filesChangedWarningThreshold): MaybeReturn<string> => {
        if (
          !Number.isInteger(Number(filesChangedWarningThreshold)) ||
          Number(filesChangedWarningThreshold) < 1
        ) {
          return 'Pick a positive whole number.';
        }
      }
    );

    this.registerValidator(
      'fileExplorerStats',
      (fileExplorerStats): MaybeReturn<string> => {
        if (!Object.values(FileExplorerStats).includes(fileExplorerStats)) {
          return 'Choose a valid option.';
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
          return `Pick a positive whole number not greater than ${MAX_SUPPORTED_INTERVAL}.`;
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
          return 'Pick a non-negative whole number.';
        }
      }
    );

    this.registerValidator(
      'checkpointReminderInterval',
      (checkpointReminderInterval): MaybeReturn<string> => {
        if (
          !(
            Number.isInteger(checkpointReminderInterval) &&
            Number(checkpointReminderInterval) >= 0 &&
            // eslint-disable-next-line no-magic-numbers
            Number(checkpointReminderInterval) <= 999_999_999
          )
        ) {
          return 'Pick a non-negative whole number.';
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
          return `Pick a whole number between ${MIN_RENAME_DETECTION_STRICTNESS} and ${MAX_RENAME_DETECTION_STRICTNESS}.`;
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
          return `Pick a positive whole number not greater than ${MAX_SUPPORTED_INTERVAL}.`;
        }
      }
    );

    this.registerValidator(
      'whitespaceIgnoreMode',
      (whitespaceIgnoreMode): MaybeReturn<string> => {
        if (
          !Object.values(WhitespaceIgnoreMode).includes(whitespaceIgnoreMode)
        ) {
          return 'Choose a valid option.';
        }
      }
    );

    this.registerValidator(
      'fileChangelogInterval',
      (fileChangelogInterval): MaybeReturn<string> => {
        if (!Object.values(ChangelogInterval).includes(fileChangelogInterval)) {
          return 'Choose a valid option.';
        }
      }
    );

    this.registerValidator(
      'vaultChangelogInterval',
      (vaultChangelogInterval): MaybeReturn<string> => {
        if (
          !Object.values(ChangelogInterval).includes(vaultChangelogInterval)
        ) {
          return 'Choose a valid option.';
        }
      }
    );
  }
}
