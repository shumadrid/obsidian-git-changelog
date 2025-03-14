import type GitChangelogPlugin from 'main.ts';

import { deepEqual } from 'obsidian-dev-utils/Object';
import {
  systemTimeZoneUnchanged,
  validateCustomTimeZone
} from 'settings/ui/CustomTimeZone.ts';

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
