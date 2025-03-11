import type GitChangelogPlugin from 'main.ts';
import type { ChangelogGenerationSettings } from 'settings/settings.ts';
import type { Spacetime } from 'spacetime';
import type { ChangelogInterval, FilesSummary, LogEntry } from 'types.ts';
import type {
  FileChangelogEntry,
  VaultChangelogEntry
} from 'Views/types.svelte.ts';

import { runFileDiff } from 'core/gitOperations/runFileDiff.ts';
import { runRepoDiff } from 'core/gitOperations/runRepoDiff.ts';
import { getDayStartTime } from 'settings/ui/DayStartTime.ts';
import { getChangelogInterval } from 'settings/validation/changelogInterval.ts';
import { applyDayStartTimeSetting } from 'timeUtils.ts';

export const GIT_MAX_CONCURRENT_PROCESSES = 6;

export function addStatsToSummary(
  mainSummary: FilesSummary,
  stats: FilesSummary
): void {
  mainSummary.addedFiles += stats.addedFiles;
  mainSummary.deletedFiles += stats.deletedFiles;
  mainSummary.renamedFiles += stats.renamedFiles;
  mainSummary.modifiedFiles += stats.modifiedFiles;
}

export async function appendToFileChangelogEntries({
  abortSignal,
  currentCommit,
  entries,
  plugin,
  previousCommit
}: {
  abortSignal: AbortSignal;
  currentCommit: LogEntry;
  entries: FileChangelogEntry[];
  plugin: GitChangelogPlugin;
  previousCommit?: LogEntry;
}): Promise<void> {
  const entry = await runFileDiff({
    abortSignal,
    newCommit: currentCommit,
    oldCommit: previousCommit,
    plugin
  });
  entries.push(entry);
}

export async function appendToVaultChangelogEntries({
  abortSignal,
  currentCommit,
  entries,
  plugin,
  previousCommit
}: {
  abortSignal: AbortSignal;
  currentCommit: LogEntry;
  entries: VaultChangelogEntry[];
  plugin: GitChangelogPlugin;
  previousCommit?: LogEntry;
}): Promise<void> {
  const entry = await runRepoDiff({
    abortSignal,
    newCommit: currentCommit,
    oldCommit: previousCommit,
    plugin
  });
  // Generate a new version only if the Git diff shows changes. Versions with no changes can occur frequently if a restrictive additional .gitignore is specified in the plugin settings.
  if (entry) {
    entries.push(entry);
  }
}

/**
 * Basic checking to avoid creating multiple version entries for the same date or interval. If a date already exists in newer entries, just ignore this anomaly (happens if Git history isn't linear).
 */
export function dateAlreadySeen({
  fullyAdjustedNewDate,
  interval,
  previouslySeenFullyAdjustedDates
}: {
  fullyAdjustedNewDate: Spacetime;
  interval: ChangelogInterval;
  previouslySeenFullyAdjustedDates: Set<Spacetime>;
}): boolean {
  // We can group the hourly versions with other versions since this date won't be displayed in the UI. We're only comparing if they're the same, so it's fine to subtract the same amount from both entries
  for (const date of previouslySeenFullyAdjustedDates) {
    if (date.isSame(fullyAdjustedNewDate, interval)) {
      return true;
    }
  }
  return false;
}

export function extractLastCommitsForInterval({
  changelogGenerationSettings,
  interval,
  previouslySeenFullyAdjustedDates,
  timezoneAdjustedLogs
}: {
  changelogGenerationSettings: ChangelogGenerationSettings;
  interval: ChangelogInterval;
  previouslySeenFullyAdjustedDates?: Set<Spacetime>;
  timezoneAdjustedLogs: LogEntry[];
}): LogEntry[] {
  const lastCommitsInEachInterval: LogEntry[] = [];
  const fullyAdjustedSeenDates =
    previouslySeenFullyAdjustedDates ?? new Set<Spacetime>();

  for (const log of timezoneAdjustedLogs) {
    const fullyAdjustedLogDate = applyDayStartTimeSetting({
      dayStartTime: getDayStartTime(changelogGenerationSettings),
      timezoneAdjustedDate: log.timezoneAdjustedDate
    });

    if (
      !dateAlreadySeen({
        fullyAdjustedNewDate: fullyAdjustedLogDate,
        interval,
        previouslySeenFullyAdjustedDates: fullyAdjustedSeenDates
      })
    ) {
      lastCommitsInEachInterval.push(log);
      fullyAdjustedSeenDates.add(fullyAdjustedLogDate);
    }
  }

  return lastCommitsInEachInterval;
}

/**
 * This allows us to check if relevant settings have changed and only then recompute changelogs, instead of recomputing after every single settings change.
 */
export function recordUsedSettings(
  plugin: GitChangelogPlugin,
  fileOrVault: 'file' | 'vault'
): void {
  plugin.settingsOfComputedCache = structuredClone(
    plugin.settings.changelogGenerationSettings
  );
  if (fileOrVault === 'vault') {
    plugin.vaultChangelogCacheInterval = getChangelogInterval(
      plugin,
      fileOrVault
    );
  } else if (fileOrVault === 'file') {
    plugin.fileChangelogCacheInterval = getChangelogInterval(
      plugin,
      fileOrVault
    );
  }
}
