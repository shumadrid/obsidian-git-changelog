import type { Spacetime } from 'spacetime';
import type { DiffFile } from 'types.ts';

import { normalizePath } from 'obsidian';
import spacetime from 'spacetime';
import { applyDayStartHourSetting } from 'timeUtils.ts';
import { ChangelogInterval } from 'types.ts';
import {
  assertNotNull,
  getFileNameFromPath,
  isMoved,
  isRenamed
} from 'utils.ts';

export function composeAriaLabel(file: DiffFile): string {
  try {
    let ariaString = '';
    if (isMoved(file)) {
      ariaString += assertNotNull(file.fromPathGitRelative);
      ariaString += ' →';
      ariaString += '\n';
      ariaString += file.pathGitRelative;
    } else if (isRenamed(file)) {
      ariaString += getFileNameFromPath({
        normalizedFilePath: normalizePath(
          assertNotNull(file.fromPathGitRelative)
        )
      });
      ariaString += ' → ';
      ariaString += getFileNameFromPath({
        normalizedFilePath: normalizePath(file.pathGitRelative)
      });
    }
    return ariaString;
  } catch {
    return '';
  }
}
export function getIntervalAdjectiveString(
  interval: ChangelogInterval
): string {
  switch (interval) {
    case ChangelogInterval.Hourly: {
      return 'hourly';
    }
    case ChangelogInterval.Daily: {
      return 'daily';
    }
    case ChangelogInterval.Weekly: {
      return 'weekly';
    }
    case ChangelogInterval.Monthly: {
      return 'monthly';
    }
  }
}

export function composeDailyVersionDisplayText({
  timeZoneAdjustedCurrentDate,
  locale,
  timeZone,
  timeZoneAdjustedEntryDate,
  dayStartHour
}: {
  timeZoneAdjustedCurrentDate: Spacetime;
  timeZoneAdjustedEntryDate: Spacetime;
  locale: string;
  dayStartHour: number;
  timeZone: string;
}): string {
  const fullyAdjustedEntryDate = applyDayStartHourSetting({
    dayStartHour,
    timeZoneAdjustedDate: timeZoneAdjustedEntryDate
  });
  const fullyAdjustedCurrentDate = applyDayStartHourSetting({
    dayStartHour,
    timeZoneAdjustedDate: timeZoneAdjustedCurrentDate
  });

  const isToday = fullyAdjustedEntryDate.isSame(
    fullyAdjustedCurrentDate,
    'day'
  );
  const isYesterday = fullyAdjustedEntryDate.isSame(
    fullyAdjustedCurrentDate.clone().subtract(1, 'days'),
    'day'
  );

  if (isToday) {
    return 'Today';
  }
  if (isYesterday) {
    return 'Yesterday';
  }

  return formatDate(fullyAdjustedEntryDate.toNativeDate(), locale, timeZone);
}

// Only for composing the UI string
export function applyDayDisplayOffset({
  dayStartHour,
  timeZoneAdjustedDate
}: {
  dayStartHour: number;
  timeZoneAdjustedDate: Spacetime;
}): Spacetime {
  const dayOffset = timeZoneAdjustedDate.hour() < dayStartHour ? 1 : 0;
  return timeZoneAdjustedDate.clone().subtract(dayOffset, 'day');
}

export function composeHourlyVersionDisplayText({
  timeZoneAdjustedEntryDate,
  locale,
  timeZone,
  timeZoneAdjustedCurrentDate
}: {
  timeZoneAdjustedEntryDate: Spacetime;
  locale: string;
  timeZoneAdjustedCurrentDate: Spacetime;
  timeZone: string;
}): string {
  const isToday = timeZoneAdjustedEntryDate.isSame(
    timeZoneAdjustedCurrentDate,
    'day'
  );
  const isYesterday = timeZoneAdjustedEntryDate.isSame(
    timeZoneAdjustedCurrentDate.clone().subtract(1, 'days'),
    'day'
  );

  // Replaces the day part of the date time string with today or yesterday labels.
  if (isToday || isYesterday) {
    const timeFormatter = new Intl.DateTimeFormat(locale, {
      timeStyle: 'short',
      timeZone
    });
    const timeString = timeFormatter.format(
      timeZoneAdjustedEntryDate.startOf('hour').toNativeDate()
    );
    return `${isToday ? 'Today' : 'Yesterday'}, ${timeString}`;
  }

  const formatter = new Intl.DateTimeFormat(locale, {
    dateStyle: 'short',
    timeStyle: 'short',
    timeZone
  });

  return formatter.format(
    timeZoneAdjustedEntryDate.startOf('hour').toNativeDate()
  );
}

export function composeMonthlyVersionDisplayText({
  timeZoneAdjustedEntryDate,
  locale,
  timeZone
}: {
  timeZoneAdjustedEntryDate: Spacetime;
  locale: string;
  timeZone: string;
}): string {
  return formatMonthYear(
    timeZoneAdjustedEntryDate.toNativeDate(),
    locale,
    timeZone
  );
}

export function composeVersionTitle({
  interval,
  dayStartHour,
  locale,
  timeZone,
  timeZoneAdjustedEntryDate,
  utcCurrentDateHour
}: {
  interval: ChangelogInterval;
  dayStartHour: number;
  locale: string;
  utcCurrentDateHour: string;
  timeZone: string;
  timeZoneAdjustedEntryDate: Spacetime;
}): string {
  // Clipped to the hour
  const timeZoneAdjustedCurrentDate =
    spacetime(utcCurrentDateHour).goto(timeZone);

  switch (interval) {
    case ChangelogInterval.Hourly: {
      return composeHourlyVersionDisplayText({
        timeZoneAdjustedEntryDate,
        timeZoneAdjustedCurrentDate,
        locale,
        timeZone
      });
    }
    case ChangelogInterval.Daily: {
      return composeDailyVersionDisplayText({
        timeZoneAdjustedEntryDate,
        timeZoneAdjustedCurrentDate,
        dayStartHour,
        locale,
        timeZone
      });
    }
    case ChangelogInterval.Weekly: {
      return composeWeeklyVersionDisplayText({
        timeZoneAdjustedEntryDate,
        timeZoneAdjustedCurrentDate,
        locale,
        timeZone
      });
    }
    case ChangelogInterval.Monthly: {
      return composeMonthlyVersionDisplayText({
        timeZoneAdjustedEntryDate,
        locale,
        timeZone
      });
    }
  }
}

export function composeWeeklyVersionDisplayText({
  timeZoneAdjustedEntryDate,
  timeZoneAdjustedCurrentDate,
  locale,
  timeZone
}: {
  timeZoneAdjustedCurrentDate: Spacetime;
  timeZoneAdjustedEntryDate: Spacetime;
  locale: string;
  timeZone: string;
}): string {
  const timeZoneAdjustedEntryWeek = timeZoneAdjustedEntryDate.startOf('week');

  // In order for this to be accurate we need to normalize the dates to the start of the interval, which is a week here.
  // If comparing would be based on what the actual commit date is of the current version is, instead of that interval that version belongs to, the diffs would be inconsistent because e.g. when comparing the latest version with the latest commit on thursday with the previous version that had it's last commit on wednesday, the diff would count 2 weeks difference instead of 1.
  const weeksDifference = timeZoneAdjustedEntryWeek.diff(
    timeZoneAdjustedCurrentDate.startOf('week'),
    'weeks'
  );

  if (weeksDifference === 0) {
    return 'This week';
  }
  if (weeksDifference === 1) {
    return 'Last week';
  }

  const weekNumber = timeZoneAdjustedEntryDate.week();

  const isCurrentYear = timeZoneAdjustedEntryDate.isSame(
    timeZoneAdjustedCurrentDate,
    'year'
  );

  const nativeTimeZoneAdjustedEntryWeek =
    timeZoneAdjustedEntryWeek.toNativeDate();

  if (isCurrentYear) {
    const monthString = new Intl.DateTimeFormat(locale, {
      month: 'short',
      timeZone
    }).format(nativeTimeZoneAdjustedEntryWeek);
    return `Week ${weekNumber}, ${monthString}`;
  }

  const monthAndYearString = new Intl.DateTimeFormat(locale, {
    month: 'short',
    year: '2-digit',
    timeZone
  }).format(nativeTimeZoneAdjustedEntryWeek);

  return `Week ${weekNumber}, ${monthAndYearString}`;
}

export function formatDate(
  date: Date,
  locale: string,
  timeZone: string
): string {
  const formatter = new Intl.DateTimeFormat(locale, {
    timeZone
  });
  return formatter.format(date);
}

// Just adds a "BINARY" label to files with no extension
export function formatDiffFileType(file: DiffFile): string {
  const fileExtension = getDisplayExtensionFromPath(file.pathGitRelative);
  if (fileExtension === '') {
    return 'BINARY';
  }

  return fileExtension.toLocaleUpperCase();
}

export function formatMonthYear(
  date: Date,
  locale: string,
  timeZone: string
): string {
  return new Intl.DateTimeFormat(locale, {
    month: 'long',
    year: 'numeric',
    timeZone
  }).format(date);
}

export function formatFullDate(
  date: Date,
  locale: string,
  timeZone: string
): string {
  return new Intl.DateTimeFormat(locale, {
    month: 'long',
    day: 'numeric',
    hour: 'numeric',
    minute: 'numeric',
    second: 'numeric',
    year: 'numeric',
    timeZone
  }).format(date);
}

export function getDisplayExtensionFromPath(filePath: string): string {
  const normalizedPath = normalizePath(filePath);
  const segments = normalizedPath.split('/');
  const fileName = segments.pop() ?? '';

  if (fileName === '') {
    return '';
  }
  // Ignore dotfiles
  if (fileName.startsWith('.') && !fileName.includes('.', 1)) {
    return '';
  }

  const dotIndex = fileName.lastIndexOf('.');
  if (dotIndex === -1 || dotIndex === fileName.length - 1) {
    return '';
  }

  return fileName.slice(Math.max(0, dotIndex + 1)).toLowerCase();
}
