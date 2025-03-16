import type GitChangelogPlugin from 'main.ts';
import type { ChangelogGenerationSettings } from 'settings/settings.ts';

import { deepEqual } from 'obsidian-dev-utils/Object';
import {
  systemTimeZoneUnchanged,
  validateCustomTimeZone
} from 'settings/ui/CustomTimeZone.ts';

export function changelogGenerationSettingsChanged({
  newChangelogSettings,
  oldChangelogSettings,
  plugin
}: {
  newChangelogSettings: ChangelogGenerationSettings;
  oldChangelogSettings: ChangelogGenerationSettings;
  plugin: GitChangelogPlugin;
}): boolean {
  if (!oldChangelogSettings) {
    return true;
  }

  // IsAncestor run

  if (
    !validateCustomTimeZone(newChangelogSettings.timezone) &&
    !systemTimeZoneUnchanged(plugin)
  ) {
    return true;
  }

  if (deepEqual(oldChangelogSettings, newChangelogSettings)) {
    return false;
  }

  return true;
}
