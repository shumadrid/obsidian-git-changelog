import type GitChangelogPlugin from 'main.ts';
import type { ChangelogGenerationSettings } from 'settings/settings.ts';
import type { Spacetime } from 'spacetime';
import type { ChangelogInterval } from 'types.ts';
import type {
  ChangelogEntry,
  FileChangelogEntry,
  VaultChangelogEntry
} from 'Views/types.svelte.ts';

import { runLog } from 'core/gitOperations/runLog.ts';
import { getDayStartTime } from 'settings/ui/DayStartTime.ts';
import { getChangelogInterval } from 'settings/validation/changelogInterval.ts';
import { applyDayStartTimeSetting } from 'timeUtils.ts';
import { AbortError } from 'types.ts';

import {
  appendToFileChangelogEntries,
  appendToVaultChangelogEntries,
  extractLastCommitsForInterval,
  recordUsedSettings
} from './helper.ts';

export async function updateChangelogEntries({
  abortSignal,
  fileOrVault,
  filePath,
  plugin
}: {
  abortSignal: AbortSignal;
  fileOrVault: 'file' | 'vault';
  filePath?: string;
  plugin: GitChangelogPlugin;
}): Promise<void> {
  const newEntries = await getLatestChangelogEntries({
    abortSignal,
    fileOrVault,
    filePath,
    plugin
  });

  recordUsedSettings(plugin, fileOrVault);
  prependToExistingEntries({
    fileOrVault,
    newEntries,
    plugin
  });
}

export function changelogCacheHasNoCompleteVersion({
  entries
}: {
  entries?: ChangelogEntry[];
}): boolean {
  if (
    entries === undefined ||
    entries.length === 0 ||
    entries[0].isInitialCommit()
  ) {
    return true;
  }
  return false;
}

/**
 * Fetches and updates the cached changelog with any missing new entries. In practice, this usually just involves overwriting the latest cached version entry with updated data.
 */
export async function getLatestChangelogEntries({
  abortSignal,
  fileOrVault,
  filePath,
  plugin
}: {
  abortSignal: AbortSignal;
  fileOrVault: 'file' | 'vault';
  filePath?: string;
  plugin: GitChangelogPlugin;
}): Promise<ChangelogEntry[]> {
  // Otherwise updateChangelogEntries for vault changelog would be accidentally triggered if filePath was left undefined
  if (fileOrVault === 'file' && filePath === undefined) {
    throw new Error(
      'filePath is required when generating file changelog entries.'
    );
  }

  /**
   * If this is undefined then the cached changelog is empty or the only version in it is the initial version.
   */
  const latestNotInitialCachedVersionHash = getLatestNotInitialCachedVersion({
    filePath,
    plugin
  });

  // Gets all commits newer (>=) than the commit of the latest cached version.
  const timezoneAdjustedLogs = await runLog({
    abortSignal,
    filePath,
    lowerBoundaryCommit: latestNotInitialCachedVersionHash,
    maxCount: undefined,
    plugin,
    upperBoundaryCommit: undefined
  });

  const extractedVersions = extractLastCommitsForInterval({
    changelogGenerationSettings: plugin.settings.changelogGenerationSettings,
    interval: getChangelogInterval(plugin, fileOrVault),
    timezoneAdjustedLogs
  });

  // Always recalculate the latest version in cached changelog (because it likely has outdated stats), but only if the latest cached version isn't also the initial version.
  if (latestNotInitialCachedVersionHash) {
    extractedVersions.push({
      filePath: filePath
        ? // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
          plugin.fileChangelogEntries![1].pathGitRelative
        : undefined,
      hash: filePath
        ? // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
          plugin.fileChangelogEntries![1].commitHash
        : // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
          plugin.vaultChangelogEntries![1].commitHash,
      timezoneAdjustedDate: filePath
        ? // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
          plugin.fileChangelogEntries![1].timezoneAdjustedDate
        : // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
          plugin.vaultChangelogEntries![1].timezoneAdjustedDate
    });
  }

  const createdVaultEntries: VaultChangelogEntry[] = [];
  const createdFileEntries: FileChangelogEntry[] = [];

  for (let index = 0; index < extractedVersions.length - 1; index++) {
    await (filePath
      ? appendToFileChangelogEntries({
          abortSignal,
          currentCommit: extractedVersions[index],
          entries: createdFileEntries,
          plugin,
          previousCommit: extractedVersions[index + 1]
        })
      : appendToVaultChangelogEntries({
          abortSignal,
          currentCommit: extractedVersions[index],
          entries: createdVaultEntries,
          plugin,
          previousCommit: extractedVersions[index + 1]
        }));
  }

  // If initial version was reached, append it as an empty version.
  if (
    extractedVersions.length > 0 &&
    latestNotInitialCachedVersionHash === undefined
  ) {
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const lastCommit = extractedVersions.at(-1)!;
    await (filePath
      ? appendToFileChangelogEntries({
          abortSignal,
          currentCommit: lastCommit,
          entries: createdFileEntries,
          plugin
        })
      : appendToVaultChangelogEntries({
          abortSignal,
          currentCommit: lastCommit,
          entries: createdVaultEntries,
          plugin
        }));
  }

  if (abortSignal.aborted) {
    throw new AbortError();
  }
  return fileOrVault === 'file' ? createdFileEntries : createdVaultEntries;
}

export function getLatestNotInitialCachedVersion({
  filePath,
  plugin
}: {
  filePath: string | undefined;
  plugin: GitChangelogPlugin;
}): string | undefined {
  const entries = filePath
    ? plugin.fileChangelogEntries
    : plugin.vaultChangelogEntries;
  if (changelogCacheHasNoCompleteVersion({ entries })) {
    return;
  }
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  return entries![0].commitHash;
}

export function isFullyAdjustedIntervalOlder({
  changelogGenerationSettings,
  interval,
  timezoneAdjustedNewDate,
  timezoneAdjustedOldDate
}: {
  changelogGenerationSettings: ChangelogGenerationSettings;
  interval: ChangelogInterval;
  timezoneAdjustedNewDate: Spacetime;
  timezoneAdjustedOldDate: Spacetime;
}): boolean {
  return applyDayStartTimeSetting({
    dayStartTime: getDayStartTime(changelogGenerationSettings),
    timezoneAdjustedDate: timezoneAdjustedOldDate
  })
    .startOf(interval)
    .isBefore(
      applyDayStartTimeSetting({
        dayStartTime: getDayStartTime(changelogGenerationSettings),
        timezoneAdjustedDate: timezoneAdjustedNewDate
      }).startOf(interval)
    );
}

/**
 * Updates the cached changelog with missing new entries. In practice, most of the time it just overwrites the latest cached version entry with newer data.
 */
export function prependToExistingEntries({
  fileOrVault,
  newEntries,
  plugin
}: {
  fileOrVault: 'file' | 'vault';
  newEntries: ChangelogEntry[];
  plugin: GitChangelogPlugin;
}): void {
  const cachedEntries: ChangelogEntry[] | undefined =
    fileOrVault === 'file'
      ? plugin.fileChangelogEntries
      : plugin.vaultChangelogEntries;

  if (cachedEntries === undefined) {
    if (fileOrVault === 'file') {
      plugin.fileChangelogEntries = newEntries as FileChangelogEntry[];
    } else {
      plugin.vaultChangelogEntries = newEntries as VaultChangelogEntry[];
    }
    return;
  }

  if (cachedEntries.length === 0) {
    cachedEntries.push(...newEntries);
    return;
  }
  // It doesn't assign undefined to the cache, as the empty result may also indicate that no new entries are available and the cached changelog is already up to date. Not designed to handle cases where the repo or file history is completely empty with no changes to detect.
  if (newEntries.length > 0) {
    // Find index where cachedEntries should start
    let firstOldEntryIndex = cachedEntries.length;
    for (const [index, cachedEntry] of cachedEntries.entries()) {
      if (
        isFullyAdjustedIntervalOlder({
          changelogGenerationSettings:
            plugin.settings.changelogGenerationSettings,
          interval: getChangelogInterval(plugin, fileOrVault),
          // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
          timezoneAdjustedNewDate: newEntries.at(-1)!.timezoneAdjustedDate,
          timezoneAdjustedOldDate: cachedEntry.timezoneAdjustedDate
        })
      ) {
        firstOldEntryIndex = index;
        break;
      }
    }
    // If updating the latest incomplete version, keep the isCollapsed state from current view. Unnecessary loop?
    if (fileOrVault === 'vault') {
      const vaultChangelogNewEntries = newEntries as VaultChangelogEntry[];
      const vaultChangelogCachedEntries =
        cachedEntries as VaultChangelogEntry[];

      for (let index = 0; index < firstOldEntryIndex; index++) {
        vaultChangelogNewEntries[
          vaultChangelogNewEntries.length - firstOldEntryIndex + index
        ].isCollapsed = vaultChangelogCachedEntries[index].isCollapsed;
      }
    }
    cachedEntries.splice(0, firstOldEntryIndex, ...newEntries);
  }
}
