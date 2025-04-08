import type GitChangelogPlugin from 'main.ts';
import type { Spacetime } from 'spacetime';
import type { DiffFile } from 'types.ts';

import { normalizePath } from 'obsidian';
import { getLocale } from 'settings/ui/CustomLocale.ts';
import { getTimeZone } from 'settings/ui/CustomTimeZone.ts';
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
  fullyAdjustedCurrentDate,
  fullyAdjustedEntryDate,
  plugin
}: {
  fullyAdjustedCurrentDate: Spacetime;
  fullyAdjustedEntryDate: Spacetime;
  plugin: GitChangelogPlugin;
}): string {
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

  return formatDate(
    fullyAdjustedEntryDate.toNativeDate(),
    getLocale(plugin),
    getTimeZone(plugin)
  );
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
  fullyAdjustedCurrentDate,
  fullyAdjustedEntryDate,
  timeZoneAdjustedEntryDate,
  plugin
}: {
  fullyAdjustedCurrentDate: Spacetime;
  fullyAdjustedEntryDate: Spacetime;
  timeZoneAdjustedEntryDate: Spacetime;
  plugin: GitChangelogPlugin;
}): string {
  // Use the fullyAdjusted dates only to check if the dates belong to the same day after the dayStartHour setting is applied.
  const isToday = fullyAdjustedEntryDate.isSame(
    fullyAdjustedCurrentDate,
    'day'
  );
  const isYesterday = fullyAdjustedEntryDate.isSame(
    fullyAdjustedCurrentDate.clone().subtract(1, 'days'),
    'day'
  );

  const userLocale = getLocale(plugin);

  const timeZone = getTimeZone(plugin);

  // Replaces the day part of the date time string with today or yesterday labels.
  if (isToday || isYesterday) {
    const timeFormatter = new Intl.DateTimeFormat(userLocale, {
      timeStyle: 'short',
      timeZone
    });
    const timeString = timeFormatter.format(
      timeZoneAdjustedEntryDate.startOf('hour').toNativeDate()
    );
    return `${isToday ? 'Today' : 'Yesterday'}, ${timeString}`;
  }

  const formatter = new Intl.DateTimeFormat(userLocale, {
    dateStyle: 'short',
    timeStyle: 'short',
    timeZone
  });

  // Use the timeZoneAdjustedEntryDate in the UI and just potentially subtract a day if it crosses the dayStartHour boundary. Don't show the fake fullyAdjustedEntryDate that has the dayStartHour offset applied to hours.
  const timeZoneAdjustedEntryDateWithDayOffset = applyDayDisplayOffset({
    dayStartHour: plugin.settings.dayStartHour,
    timeZoneAdjustedDate: timeZoneAdjustedEntryDate
  });

  return formatter.format(
    timeZoneAdjustedEntryDateWithDayOffset.startOf('hour').toNativeDate()
  );
}

export function composeMonthlyVersionDisplayText({
  fullyAdjustedEntryDate,
  plugin
}: {
  fullyAdjustedEntryDate: Spacetime;
  plugin: GitChangelogPlugin;
}): string {
  return formatMonthYear(
    fullyAdjustedEntryDate.toNativeDate(),
    getLocale(plugin),
    getTimeZone(plugin)
  );
}

export function composeVersionTitle({
  interval,
  plugin,
  timeZoneAdjustedEntryDate
}: {
  interval: ChangelogInterval;
  plugin: GitChangelogPlugin;
  timeZoneAdjustedEntryDate: Spacetime;
}): string {
  const timeZoneAdjustedCurrentDate = spacetime.now(getTimeZone(plugin));
  const fullyAdjustedCurrentDate = applyDayStartHourSetting({
    dayStartHour: plugin.settings.dayStartHour,
    timeZoneAdjustedDate: timeZoneAdjustedCurrentDate
  });
  const fullyAdjustedEntryDate = applyDayStartHourSetting({
    dayStartHour: plugin.settings.dayStartHour,
    timeZoneAdjustedDate: timeZoneAdjustedEntryDate
  });

  switch (interval) {
    case ChangelogInterval.Hourly: {
      return composeHourlyVersionDisplayText({
        fullyAdjustedCurrentDate,
        fullyAdjustedEntryDate,
        timeZoneAdjustedEntryDate,
        plugin
      });
    }
    case ChangelogInterval.Daily: {
      return composeDailyVersionDisplayText({
        fullyAdjustedCurrentDate,
        fullyAdjustedEntryDate,
        plugin
      });
    }
    case ChangelogInterval.Weekly: {
      return composeWeeklyVersionDisplayText({
        fullyAdjustedCurrentDate,
        fullyAdjustedEntryDate,
        plugin
      });
    }
    case ChangelogInterval.Monthly: {
      return composeMonthlyVersionDisplayText({
        fullyAdjustedEntryDate,
        plugin
      });
    }
  }
}

export function composeWeeklyVersionDisplayText({
  fullyAdjustedCurrentDate,
  fullyAdjustedEntryDate,
  plugin
}: {
  fullyAdjustedCurrentDate: Spacetime;
  fullyAdjustedEntryDate: Spacetime;
  plugin: GitChangelogPlugin;
}): string {
  const fullyAdjustedEntryWeek = fullyAdjustedEntryDate.startOf('week');

  // In order for this to be accurate we need to normalize the dates to the start of the interval, which is a week here. If comparing would be based on what the actual commit date is of the current version is, instead of that interval that version belongs to, the diffs would be inconsistent because e.g. when comparing the latest version with the latest commit on thursday with the previous version that had it's last commit on wednesday, the diff would count 2 weeks difference instead of 1.
  const weeksDifference = fullyAdjustedEntryWeek.diff(
    fullyAdjustedCurrentDate.startOf('week'),
    'weeks'
  );

  if (weeksDifference === 0) {
    return 'This week';
  }
  if (weeksDifference === 1) {
    return 'Last week';
  }

  const userLocale = getLocale(plugin);

  const weekNumber = fullyAdjustedEntryDate.week();

  const isCurrentYear = fullyAdjustedEntryDate.isSame(
    fullyAdjustedCurrentDate,
    'year'
  );

  const nativeFullyAdjustedEntryWeek = fullyAdjustedEntryWeek.toNativeDate();
  const timeZone = getTimeZone(plugin);

  if (isCurrentYear) {
    const monthString = new Intl.DateTimeFormat(userLocale, {
      month: 'short',
      timeZone
    }).format(nativeFullyAdjustedEntryWeek);
    return `Week ${weekNumber}, ${monthString}`;
  }

  const monthAndYearString = new Intl.DateTimeFormat(userLocale, {
    month: 'short',
    year: '2-digit',
    timeZone
  }).format(nativeFullyAdjustedEntryWeek);

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
