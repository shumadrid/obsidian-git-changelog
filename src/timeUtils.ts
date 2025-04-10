/* eslint-disable unicorn/prevent-abbreviations */
import type { Spacetime } from 'spacetime';
import type { LogEntry } from 'types.ts';

/**
 *  This function produces "fullyAdjusted" dates, which are dates that have the "day start time" setting applied to a "timeAdjustedDate". timeZoneAdjustedDate is a date adjusted with the timeZone setting specified in the settings tab.
 */
export function applyDayStartHourSetting({
  dayStartHour,
  timeZoneAdjustedDate
}: {
  dayStartHour: number;
  timeZoneAdjustedDate: Spacetime;
}): Spacetime {
  return timeZoneAdjustedDate.subtract(dayStartHour, 'hours');
}

export function getDayStartHourAdjustedLogs(
  logEntries: LogEntry[],
  dayStartHour: number
): LogEntry[] {
  if (dayStartHour === 0) {
    return logEntries;
  }
  return logEntries.map((entry) => {
    return {
      ...entry,
      fullyAdjustedDate: applyDayStartHourSetting({
        dayStartHour,
        timeZoneAdjustedDate: entry.timeZoneAdjustedDate
      })
    };
  });
}
export function formatDateHour(date: Spacetime): string {
  return date.startOf('hour').format('iso-utc');
}
