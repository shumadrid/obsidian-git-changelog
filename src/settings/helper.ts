import type { GitChangelogSettings } from 'settings/settings.ts';
import type { ReadonlyDeep } from 'type-fest';

import { deepEqual } from 'obsidian-dev-utils/Object';
import { pickGeneralChangelogSettings } from 'settings/settings.ts';

export function changelogGenerationSettingsChanged({
  newSettings,
  oldSettings
}: {
  newSettings: ReadonlyDeep<GitChangelogSettings>;
  oldSettings: ReadonlyDeep<GitChangelogSettings>;
}): boolean {
  const oldVaultGenerationSettings = pickGeneralChangelogSettings(oldSettings);
  const newVaultGenerationSettings = pickGeneralChangelogSettings(newSettings);

  // IsAncestor run

  // Don't have to check if the detected system time zone or detected locale changed since they're only assigned once at startup.

  return !deepEqual(oldVaultGenerationSettings, newVaultGenerationSettings);
}
