import type GitChangelogPlugin from 'main.ts';

import { DEFAULT_SETTINGS } from 'settings/settings.ts';
import { ChangelogInterval } from 'types.ts';

export function getChangelogInterval(
  plugin: GitChangelogPlugin,
  fileOrVault: 'file' | 'vault'
): ChangelogInterval {
  const interval =
    fileOrVault === 'file'
      ? plugin.settings.fileChangelogInterval
      : plugin.settings.vaultChangelogInterval;

  if (!validateChangelogInterval(interval)) {
    return fileOrVault === 'file'
      ? DEFAULT_SETTINGS.fileChangelogInterval
      : DEFAULT_SETTINGS.vaultChangelogInterval;
  }

  return interval;
}

export async function setNextChangelogInterval(
  plugin: GitChangelogPlugin,
  fileOrVault: 'file' | 'vault'
): Promise<void> {
  let interval =
    fileOrVault === 'file'
      ? plugin.settings.fileChangelogInterval
      : plugin.settings.vaultChangelogInterval;

  switch (interval) {
    case ChangelogInterval.Daily: {
      interval = ChangelogInterval.Weekly;
      break;
    }
    case ChangelogInterval.Hourly: {
      interval = ChangelogInterval.Daily;
      break;
    }
    case ChangelogInterval.Monthly: {
      interval = ChangelogInterval.Hourly;
      break;
    }
    case ChangelogInterval.Weekly: {
      interval = ChangelogInterval.Monthly;
      break;
    }
  }

  const newSettings = plugin.settingsClone;
  // Update the actual setting
  if (fileOrVault === 'file') {
    newSettings.fileChangelogInterval = interval;
  } else {
    newSettings.vaultChangelogInterval = interval;
  }
  // "false" because this function is only called in the context of triggering a new changelog computation, so we don't want to trigger a check that usually runs for this function (trigger recompute if some changelog generation settings changed).
  await plugin.saveSettings(newSettings, false);
}

export function validateChangelogInterval(
  changelogInterval: ChangelogInterval
): boolean {
  if (Object.values(ChangelogInterval).includes(changelogInterval)) {
    return true;
  }
  return false;
}
