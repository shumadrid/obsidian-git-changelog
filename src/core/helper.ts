import type { ChangelogGenerationSettings } from 'settings/settings.ts';
import type { Spacetime } from 'spacetime';
import type { ChangelogInterval, FilesSummary, LogEntry } from 'types.ts';

import { getDayStartTime } from 'settings/ui/DayStartTime.ts';
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
