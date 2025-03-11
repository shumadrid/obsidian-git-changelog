import type GitChangelogPlugin from 'main.ts';

import { deepEqual } from 'obsidian-dev-utils/Object';
import {
  systemTimeZoneUnchanged,
  validateCustomTimeZone
} from 'settings/ui/CustomTimeZone.ts';
import { getStatusBarAlternateInterval } from 'settings/ui/StatusBarInterval.ts';
import { getChangelogInterval } from 'settings/validation/changelogInterval.ts';

export function changelogGenerationSettingsUnchanged(
  plugin: GitChangelogPlugin
): boolean {
  const oldSettings = plugin.settingsOfComputedCache;
  const newSettings = plugin.settings.changelogGenerationSettings;

  if (!oldSettings) {
    return false;
  }
  // IsAncestor run

  if (
    !validateCustomTimeZone(newSettings.timezone) &&
    !systemTimeZoneUnchanged(plugin)
  ) {
    return false;
  }

  if (deepEqual(oldSettings, newSettings)) {
    return true;
  }
  return false;
}

export function fileChangelogGenerationSettingsUnchanged(
  plugin: GitChangelogPlugin
): boolean {
  return (
    getChangelogInterval(plugin, 'file') === plugin.fileChangelogCacheInterval
  );
}

export function statusBarSettingsUnchanged(
  plugin: GitChangelogPlugin
): boolean {
  return (
    getStatusBarAlternateInterval(plugin) === plugin.statusBarCachedTimeframe
  );
}

export function vaultChangelogGenerationSettingsUnchanged(
  plugin: GitChangelogPlugin
): boolean {
  return (
    getChangelogInterval(plugin, 'vault') === plugin.vaultChangelogCacheInterval
  );
}
