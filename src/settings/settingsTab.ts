import type { GitChangelogPlugin } from 'GitChangelogPlugin.svelte.ts';

import { PluginSettingsTabBase } from 'obsidian-dev-utils/obsidian/Plugin/PluginSettingsTabBase';
import { DEFAULT_SETTINGS } from 'settings/settings.ts';
import { MiscellaneousButtons } from 'settings/ui/MiscellaneousButtons.ts';

import { AutoCommitDisabledWarning } from './ui/AutoCommitDisabledWarning.ts';
import { CustomTimeZone } from './ui/CustomTimeZone.ts';
import { DayStartTime } from './ui/DayStartTime.ts';
import { DiffAlgorithmOptions } from './ui/DiffAlgorithmOptions.ts';
import { GitDiffIgnore } from './ui/GitDiffIgnore.ts';
import { GitPluginWarning } from './ui/GitPluginWarning.ts';
import { RenameDetectionFileLimit } from './ui/RenameDetectionFileLimit.ts';
import { RenameDetectionSensitivitySlider } from './ui/RenameDetectionSensitivitySlider.ts';
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
    new DiffAlgorithmOptions({
      containerEl,
      plugin
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

    new StatusBarStatsToggle({
      containerEl,
      plugin,
      settingTab: this
    }).display();
    new StatusBarInterval({
      containerEl,
      disabled: !(
        plugin.settings.statusBarStats ?? DEFAULT_SETTINGS.statusBarStats
      ),
      plugin
    }).display();
    // New ChangelogStatsInFileExplorerOptions(plugin, containerEl, false, this).display();

    // New FileExplorerStatsInterval(
    //   Plugin,
    //   ContainerEl,
    //   (plugin.settings?.fileExplorerChangelogStats ??
    //     DEFAULT_SETTINGS.fileExplorerChangelogStats) ===
    //     FileExplorerChangelogStats.Disabled
    // ).display();

    new GitDiffIgnore({ containerEl, plugin }).display();
    new RenameDetectionSensitivitySlider({
      containerEl,
      plugin
    }).display();
    new RenameDetectionFileLimit({
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
