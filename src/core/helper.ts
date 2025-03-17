import type { ChangelogGenerationSettings } from 'settings/settings.ts';
import type { Spacetime, TimeUnit } from 'spacetime';
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
 * Basic checking to avoid creating multiple version entries for the same date or interval.
 * If a date already exists in newer entries, just ignore this anomaly (happens if Git history isn't linear).
 */
export async function dateAlreadySeen({
  fullyAdjustedNewDate,
  interval,
  previouslySeenFullyAdjustedDates
}: {
  fullyAdjustedNewDate: Spacetime;
  interval: ChangelogInterval;
  previouslySeenFullyAdjustedDates: Set<Spacetime>;
}): Promise<boolean> {
  // We can group the hourly versions with other versions since this date won't be displayed in the UI.
  // We're only comparing if they're the same, so it's fine to subtract the same amount from both entries
  for (const date of previouslySeenFullyAdjustedDates) {
    const result = await isSameAsync({
      firstDate: date,
      secondDate: fullyAdjustedNewDate,
      unit: interval
    });
    if (result) {
      return true;
    }
  }
  return false;
}

/**
 * The isSame() sync function was being called many times inside extractLastCommitsForInterval, and it caused the UI to freeze for a few seconds when the interval is a week,
 * because spacetime week calculations are inefficient.
 */
export async function isSameAsync({
  firstDate,
  secondDate,
  unit
}: {
  firstDate: Spacetime;
  secondDate: Spacetime;
  unit: Date | Spacetime | TimeUnit;
}): Promise<boolean> {
  const promise = new Promise<boolean>((resolve) => {
    setImmediate(() => {
      resolve(firstDate.isSame(secondDate, unit));
    });
  });

  return await promise;
}

export async function extractLastCommitsForInterval({
  changelogGenerationSettings,
  interval,
  previouslySeenFullyAdjustedDates,
  timezoneAdjustedLogs
}: {
  changelogGenerationSettings: ChangelogGenerationSettings;
  interval: ChangelogInterval;
  previouslySeenFullyAdjustedDates?: Set<Spacetime>;
  timezoneAdjustedLogs: LogEntry[];
}): Promise<LogEntry[]> {
  const lastCommitsInEachInterval: LogEntry[] = [];
  const fullyAdjustedSeenDates =
    previouslySeenFullyAdjustedDates ?? new Set<Spacetime>();

  for (const log of timezoneAdjustedLogs) {
    const fullyAdjustedLogDate = applyDayStartTimeSetting({
      dayStartTime: getDayStartTime(changelogGenerationSettings),
      timezoneAdjustedDate: log.timezoneAdjustedDate
    });

    const logDateAlreadySeen = await dateAlreadySeen({
      fullyAdjustedNewDate: fullyAdjustedLogDate,
      interval,
      previouslySeenFullyAdjustedDates: fullyAdjustedSeenDates
    });

    if (!logDateAlreadySeen) {
      lastCommitsInEachInterval.push(log);
      fullyAdjustedSeenDates.add(fullyAdjustedLogDate);
    }
  }

  return lastCommitsInEachInterval;
}
