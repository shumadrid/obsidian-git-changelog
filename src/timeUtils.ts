/* eslint-disable unicorn/prevent-abbreviations */
import type { Spacetime } from 'spacetime';
import type { LogEntry } from 'types.ts';

/**
 *  This function produces "fullyAdjusted" dates, which are dates that have the "day start time" setting applied to a "timeAdjustedDate". timezoneAdjustedDate is a date adjusted with the timezone setting specified in the settings tab.
 */
export function applyDayStartTimeSetting({
  dayStartTime,
  timezoneAdjustedDate
}: {
  dayStartTime: number;
  timezoneAdjustedDate: Spacetime;
}): Spacetime {
  return timezoneAdjustedDate.subtract(dayStartTime, 'minutes');
}

export function getDayStartTimeAdjustedLogs(
  logEntries: LogEntry[],
  dayStartTime: number
): LogEntry[] {
  if (dayStartTime === 0) {
    return logEntries;
  }
  return logEntries.map((entry) => {
    return {
      ...entry,
      fullyAdjustedDate: applyDayStartTimeSetting({
        dayStartTime,
        timezoneAdjustedDate: entry.timezoneAdjustedDate
      })
    };
  });
}
