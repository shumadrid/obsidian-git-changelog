import type GitChangelogPlugin from 'main.ts';

import { DEFAULT_SETTINGS } from 'settings/settings.ts';
import { ChangelogInterval } from 'types.ts';

// Redundant currently
export function getChangelogIntervalFromSettings(
  plugin: GitChangelogPlugin,
  fileOrVault: 'file' | 'vault'
): ChangelogInterval {
  const interval =
    fileOrVault === 'file'
      ? plugin.settings.fileChangelogInterval
      : plugin.settings.vaultChangelogGenerationSettings.interval;

  if (!validateChangelogInterval(interval)) {
    return fileOrVault === 'file'
      ? DEFAULT_SETTINGS.fileChangelogInterval
      : DEFAULT_SETTINGS.vaultChangelogGenerationSettings.interval;
  }

  return interval;
}

export function validateChangelogInterval(
  changelogInterval: ChangelogInterval
): boolean {
  if (Object.values(ChangelogInterval).includes(changelogInterval)) {
    return true;
  }
  return false;
}
