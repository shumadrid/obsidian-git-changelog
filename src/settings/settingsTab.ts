import type { GitChangelogPlugin } from 'GitChangelogPlugin.svelte.ts';

import { PluginSettingsTabBase } from 'obsidian-dev-utils/obsidian/Plugin/PluginSettingsTabBase';
import { CustomLocale } from 'settings/ui/CustomLocale.ts';
import { DiffAlgorithmOptions } from 'settings/ui/DiffAlgorithmOptions.ts';
import { DiffConfigHeading } from 'settings/ui/DiffConfigHeading.ts';
import { IgnoreBlankLinesToggle } from 'settings/ui/IgnoreBlankLinesToggle.ts';
import { MiscellaneousButtons } from 'settings/ui/MiscellaneousButtons.ts';
import { WhitespaceIgnoreModeOptions } from 'settings/ui/WhitespaceIgnoreMode.ts';

import { AutoCommitDisabledWarning } from './ui/AutoCommitDisabledWarning.ts';
import { CustomTimeZone } from './ui/CustomTimeZone.ts';
import { DayStartTime } from './ui/DayStartTime.ts';
import { ExcludeFilesAndFolders } from './ui/ExcludeFilesAndFolders.ts';
import { GitPluginWarning } from './ui/GitPluginWarning.ts';
import { RenameDetectionFileLimit } from './ui/RenameDetectionFileLimit.ts';
import { RenameDetectionStrictnessSlider } from './ui/RenameDetectionStrictnessSlider.ts';
import { StatusBarInterval } from './ui/StatusBarInterval.ts';
import { StatusBarStatsToggle } from './ui/StatusBarStatsToggle.ts';

// Commented-out settings are for features that will be implemented later
export class GitChangelogSettingsTab extends PluginSettingsTabBase<GitChangelogPlugin> {
  public override display(): void {
    const { containerEl, plugin } = this;

    containerEl.empty();
    // Const notifyOnLargeChanges =
    //   Plugin.settings.notifyIfContentDeletionsAndMovesThresholdReached ??
    //   DEFAULT_SETTINGS.notifyIfContentDeletionsAndMovesThresholdReached;

    new GitPluginWarning({ containerEl, plugin }).display();

    new AutoCommitDisabledWarning({
      containerEl,
      plugin
    }).display();

    new DayStartTime({ containerEl, plugin }).display();

    new CustomTimeZone({ containerEl, plugin }).display();

    new CustomLocale({ containerEl, plugin }).display();

    new DiffAlgorithmOptions({
      containerEl,
      plugin,
      settingTab: this
    }).display();

    // New DeletionsNotificationThreshold(plugin, containerEl, false, this).display();
    // New configureDeletionsMovesAlert(
    //   Plugin,
    //   ContainerEl,
    //   !notifyOnLargeChanges
    // ).display();
    // New FileChangesNotificationThreshold(
    //   Plugin,
    //   ContainerEl,
    //   NotifyOnLargeChanges
    // ).display();
    // New ChangelogStatsInFileExplorerOptions(plugin, containerEl, false, this).display();

    // New FileExplorerStatsInterval(
    //   Plugin,
    //   ContainerEl,
    //   (plugin.settings?.fileExplorerChangelogStats ??
    //     DEFAULT_SETTINGS.fileExplorerChangelogStats) ===
    //     FileExplorerChangelogStats.Disabled
    // ).display();
    new ExcludeFilesAndFolders({ containerEl, plugin }).display();

    new RenameDetectionStrictnessSlider({
      containerEl,
      plugin
    }).display();

    new RenameDetectionFileLimit({
      containerEl,
      plugin
    }).display();

    new StatusBarStatsToggle({
      containerEl,
      plugin,
      settingTab: this
    }).display();

    new StatusBarInterval({
      containerEl,
      disabled: !plugin.settings.statusBarStats,
      plugin
    }).display();

    new DiffConfigHeading({
      containerEl,
      plugin
    }).display();

    new WhitespaceIgnoreModeOptions({
      containerEl,
      plugin
    }).display();

    new IgnoreBlankLinesToggle({
      containerEl,
      plugin
    }).display();

    new MiscellaneousButtons({
      containerEl,
      plugin
    }).display();
  }
  // New DetectMovedContentToggle(plugin, containerEl).display();
  // New ChangelogMeasurementUnit(plugin, containerEl).display();
}
