import type { GitChangelogPluginTypes } from 'constants.ts';

import { PluginSettingsTabBase } from 'obsidian-dev-utils/obsidian/Plugin/PluginSettingsTabBase';
import { CustomLocale } from 'settings/ui/CustomLocale.ts';
import { DayStartHour } from 'settings/ui/DayStartTime.ts';
import { DiffAlgorithmOptions } from 'settings/ui/DiffAlgorithmOptions.ts';
import { IgnoreBlankLinesToggle } from 'settings/ui/IgnoreBlankLinesToggle.ts';
import { IncludeItemsToggle } from 'settings/ui/IncludeItemsToggle.ts';
import { MiscellaneousButtons } from 'settings/ui/MiscellaneousButtons.ts';
import { WhitespaceIgnoreModeOptions } from 'settings/ui/WhitespaceIgnoreMode.ts';
import { WhitespaceSettingsHeading } from 'settings/ui/WhitespaceSettingsHeading.ts';

import { AutoCommitDisabledWarning } from './ui/AutoCommitDisabledWarning.ts';
import { CustomTimeZone } from './ui/CustomTimeZone.ts';
import { ExcludeFilesAndFolders } from './ui/ExcludeFilesAndFolders.ts';
import { GitPluginWarning } from './ui/GitPluginWarning.ts';
import { RenameDetectionFileLimit } from './ui/RenameDetectionFileLimit.ts';
import { RenameDetectionStrictnessSlider } from './ui/RenameDetectionStrictnessSlider.ts';
import { StatusBarInterval } from './ui/StatusBarInterval.ts';
import { StatusBarStatsToggle } from './ui/StatusBarStatsToggle.ts';

// Commented-out settings are for features that will be implemented later
export class GitChangelogSettingsTab extends PluginSettingsTabBase<GitChangelogPluginTypes> {
  public override display(): void {
    const { containerEl, plugin } = this;

    containerEl.empty();
    // Const notifyOnLargeChanges =
    //   Plugin.settings.notifyIfContentDeletionsAndMovesThresholdReached ??
    //   DEFAULT_SETTINGS.notifyIfContentDeletionsAndMovesThresholdReached;

    new GitPluginWarning({ plugin }).display();

    new AutoCommitDisabledWarning({ plugin }).display();

    new DayStartHour({ plugin }).display();

    new CustomTimeZone({ plugin }).display();

    new CustomLocale({ plugin }).display();

    new DiffAlgorithmOptions({ plugin }).display();

    // New DeletionsNotificationThreshold(plugin,  false, this).display();
    // New configureDeletionsMovesAlert(
    //   Plugin,
    //
    //   !notifyOnLargeChanges
    // ).display();
    // New FileChangesNotificationThreshold(
    //   Plugin,
    //
    //   NotifyOnLargeChanges
    // ).display();
    // New ChangelogStatsInFileExplorerOptions(plugin,  false, this).display();

    // New FileExplorerStatsInterval(
    //   Plugin,
    //
    //   (plugin.settings?.fileExplorerChangelogStats ??
    //     DEFAULT_SETTINGS.fileExplorerChangelogStats) ===
    //     FileExplorerChangelogStats.Disabled
    // ).display();
    new ExcludeFilesAndFolders({ plugin }).display();

    new IncludeItemsToggle({ plugin }).display();

    new RenameDetectionStrictnessSlider({ plugin }).display();

    new RenameDetectionFileLimit({ plugin }).display();

    new StatusBarStatsToggle({ plugin }).display();

    new StatusBarInterval({
      disabled: !plugin.settings.statusBarStatsEnabled,
      plugin
    }).display();

    new WhitespaceSettingsHeading({ plugin }).display();

    new WhitespaceIgnoreModeOptions({ plugin }).display();

    new IgnoreBlankLinesToggle({ plugin }).display();

    new MiscellaneousButtons({ plugin }).display();
  }
  // New DetectMovedContentToggle(plugin, containerEl).display();
  // New ChangelogMeasurementUnit(plugin, containerEl).display();
}
