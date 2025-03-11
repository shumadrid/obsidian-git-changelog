/* eslint-disable no-magic-numbers */
import type GitChangelogPlugin from 'main.ts';
import type { Spacetime } from 'spacetime';
import type { LogEntry } from 'types.ts';
import type {
  ChangelogEntry,
  FileChangelogEntry,
  VaultChangelogEntry
} from 'Views/types.svelte.ts';

import { runLog } from 'core/gitOperations/runLog.ts';
import {
  appendToFileChangelogEntries,
  appendToVaultChangelogEntries,
  extractLastCommitsForInterval,
  recordUsedSettings
} from 'core/helper.ts';
import { getChangelogInterval } from 'settings/validation/changelogInterval.ts';
import { AbortError, ChangelogInterval } from 'types.ts';

export async function appendChangelogEntries({
  abortSignal,
  fileOrVault,
  filePath,
  plugin,
  resetCache,
  upperBoundaryCommit
}: {
  abortSignal: AbortSignal;
  fileOrVault: 'file' | 'vault';
  filePath: string | undefined;
  plugin: GitChangelogPlugin;
  resetCache: boolean;
  upperBoundaryCommit: string | undefined;
}): Promise<void> {
  // Either schedule it in a queue or run it directly. These both functions needs to be wrapped inside a promise and passed into the queue.
  const newEntries = await getNextChangelogEntries({
    abortSignal,
    fileOrVault,
    filePath,
    plugin,
    resetCache,
    upperBoundaryCommit
  });

  recordUsedSettings(plugin, fileOrVault);
  appendToExistingEntries({
    fileOrVault,
    loadedFileEntries:
      fileOrVault === 'file' ? (newEntries as FileChangelogEntry[]) : undefined,
    loadedVaultEntries:
      fileOrVault === 'vault'
        ? (newEntries as VaultChangelogEntry[])
        : undefined,
    plugin,
    resetCache
  });
}

// eslint-disable-next-line complexity
export async function getNextChangelogEntries({
  abortSignal,
  fileOrVault,
  filePath,
  plugin,
  resetCache,
  upperBoundaryCommit
}: {
  abortSignal: AbortSignal;
  fileOrVault: 'file' | 'vault';
  filePath: string | undefined;
  plugin: GitChangelogPlugin;
  resetCache: boolean;
  upperBoundaryCommit: string | undefined;
}): Promise<ChangelogEntry[]> {
  // Without this check, appendChangelogEntries for vault changelog could be accidentally triggered if filePath is undefined
  if (fileOrVault === 'file' && filePath === undefined) {
    throw new Error(
      'filePath is required when generating file changelog entries.'
    );
  }

  const CHANGELOG_LOAD_AMOUNT_BASE_MULTIPLIER = 35;
  const CHANGELOG_LOAD_AMOUNT_VERSIONS = 10;

  let reachedInitialCommit = false;

  // Try to calculate the optimal max-count number based on varying circumstances.
  // Ideally we get just enough logs to fill one batch when scrolling without discard any extra logs or going into more than 1 while loop iteration.
  const initialLoadMultiplier = resetCache ? 2 : 1;
  const vaultWideMultiplier = fileOrVault === 'file' ? 1 : 6;
  const fileViewVersionsMultiplier = fileOrVault === 'file' ? 2.4 : 1;
  const interval = getChangelogInterval(plugin, fileOrVault);
  const intervalMultiplier = getIntervalMaxCountMultiplier(interval);
  const logMaxCount =
    CHANGELOG_LOAD_AMOUNT_BASE_MULTIPLIER *
    initialLoadMultiplier *
    vaultWideMultiplier *
    intervalMultiplier;
  const minVersionsToGet = Math.ceil(
    initialLoadMultiplier *
      fileViewVersionsMultiplier *
      CHANGELOG_LOAD_AMOUNT_VERSIONS
  );
  const maxVersionsToGet = Math.ceil(
    3 * fileViewVersionsMultiplier * CHANGELOG_LOAD_AMOUNT_VERSIONS
  );
  plugin.consoleDebug(
    'appendChangelogEntries minVersionsToGet',
    minVersionsToGet
  );

  const fullyAdjustedSeenDates = new Set<Spacetime>();

  let startingCommit = upperBoundaryCommit; // Inclusive
  let startingFilePath: string | undefined = filePath;
  const lastCommitsInEachVersion: LogEntry[] = [];
  const loadedVaultEntries: VaultChangelogEntry[] = [];
  const loadedFileEntries: FileChangelogEntry[] = [];

  let upperBoundaryVersionRemoved = false;

  // This needs to be cached so that if the original reference in the changelogTaskManager gets reassigned because the queue was cleared, this still points to the old signal.

  let logCycles = 0;
  while (
    lastCommitsInEachVersion.length +
      loadedVaultEntries.length +
      loadedFileEntries.length <
      minVersionsToGet &&
    !reachedInitialCommit
  ) {
    logCycles++;

    const timezoneAdjustedLogs = await runLog({
      abortSignal,
      filePath: startingFilePath,
      lowerBoundaryCommit: undefined,
      maxCount: logMaxCount,
      plugin,
      upperBoundaryCommit: startingCommit
    });

    // All we need from a version is its latest commit, not all commits included in that interval
    const extractedVersions = extractLastCommitsForInterval({
      changelogGenerationSettings: plugin.settings.changelogGenerationSettings,
      interval,
      previouslySeenFullyAdjustedDates: fullyAdjustedSeenDates,
      timezoneAdjustedLogs
    });

    if (timezoneAdjustedLogs.length < logMaxCount) {
      reachedInitialCommit = true;
    }
    // If getting file changelog versions and need to loop many times, we need to track the file path across renames so that we can follow the target file across its whole history.
    startingFilePath = timezoneAdjustedLogs.at(-1)?.filePath;

    startingCommit = timezoneAdjustedLogs.at(-1)?.hash;

    lastCommitsInEachVersion.push(...extractedVersions);

    // Remove the first version if upper boundary commit was specified (to avoid duplicates, because the first version includes the upper boundary commit)
    if (
      upperBoundaryCommit !== undefined &&
      lastCommitsInEachVersion.length > 0 &&
      !upperBoundaryVersionRemoved
    ) {
      lastCommitsInEachVersion.shift();
      upperBoundaryVersionRemoved = true;
    }

    plugin.consoleDebug(
      'Amount of versions retrieved from Git log:',
      lastCommitsInEachVersion.length
    );

    // Process all versions except the last one. Uses the last version only for comparison and doesn't calculate stats for that version because it has no previous version to compare against (in this loop iteration at least)
    while (
      lastCommitsInEachVersion.length > 1 &&
      loadedFileEntries.length + loadedVaultEntries.length < maxVersionsToGet
    ) {
      const currentCommit = lastCommitsInEachVersion[0];
      const previousCommit = lastCommitsInEachVersion[1];

      await (fileOrVault === 'file'
        ? appendToFileChangelogEntries({
            abortSignal,
            currentCommit,
            entries: loadedFileEntries,
            plugin,
            previousCommit
          })
        : appendToVaultChangelogEntries({
            abortSignal,
            currentCommit,
            entries: loadedVaultEntries,
            plugin,
            previousCommit
          }));
      lastCommitsInEachVersion.shift();
    }
  }
  plugin.consoleDebug(
    'Appending log cycles to get sufficient versions:',
    logCycles
  );

  // After the while loop ends, there should always be one entry left in the lastCommitsInEachVersion array.
  // We do additional logic if that entry is the initial version.
  const nextVersionIsInitialVersion =
    reachedInitialCommit &&
    // Only append the initial version if we already loaded everything after it, and the initial version is the only one that's left.
    lastCommitsInEachVersion.length === 1;

  // If initial version reached, then just return an empty version entry for now (TODO: Implement comparing to empty state)
  if (nextVersionIsInitialVersion) {
    const lastCommit = lastCommitsInEachVersion[0];
    await (fileOrVault === 'file'
      ? appendToFileChangelogEntries({
          abortSignal,
          currentCommit: lastCommit,
          entries: loadedFileEntries,
          plugin
        })
      : appendToVaultChangelogEntries({
          abortSignal,
          currentCommit: lastCommit,
          entries: loadedVaultEntries,
          plugin
        }));
  }

  // Final check to see if we still want these results.
  if (abortSignal.aborted) {
    throw new AbortError();
  }

  return fileOrVault === 'file' ? loadedFileEntries : loadedVaultEntries;
}

export function getIntervalMaxCountMultiplier(
  interval: ChangelogInterval
): 1 | 200 | 56 | 9 {
  switch (interval) {
    case ChangelogInterval.Daily: {
      return 9;
    }
    case ChangelogInterval.Hourly: {
      return 1;
    }
    case ChangelogInterval.Monthly: {
      return 200;
    }
    case ChangelogInterval.Weekly: {
      return 56;
    }
    default: {
      return 1;
    }
  }
}

function appendToExistingEntries({
  fileOrVault,
  loadedFileEntries,
  loadedVaultEntries,
  plugin,
  resetCache
}: {
  fileOrVault: 'file' | 'vault';
  loadedFileEntries: FileChangelogEntry[] | undefined;
  loadedVaultEntries: undefined | VaultChangelogEntry[];
  plugin: GitChangelogPlugin;
  resetCache: boolean;
}): void {
  if (resetCache) {
    if (fileOrVault === 'file') {
      plugin.fileChangelogEntries = loadedFileEntries;
    } else {
      let firstVersionCollapsed: boolean | undefined;
      // Copy over previous first version's collapsed state in the vault changelog if we are changing intervals...
      if (
        plugin.vaultChangelogEntries !== undefined &&
        plugin.vaultChangelogEntries.length > 0
      ) {
        firstVersionCollapsed = plugin.vaultChangelogEntries[0].isCollapsed;
      }
      plugin.vaultChangelogEntries = loadedVaultEntries;
      // ...or expand the first version if this is the initial load
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      if (plugin.vaultChangelogEntries!.length > 0) {
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        plugin.vaultChangelogEntries![0].isCollapsed =
          firstVersionCollapsed ?? false;
      }
    }
  }
  // If we are not resetting the cache, append the new versions to the existing ones.
  else if (fileOrVault === 'file') {
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    plugin.fileChangelogEntries!.push(...loadedFileEntries!);
  } else {
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    plugin.vaultChangelogEntries!.push(...loadedVaultEntries!);
  }
}
