import type GitChangelogPlugin from 'main.ts';
import type { Spacetime } from 'spacetime';
import type { DiffFile } from 'types.ts';

import { normalizePath } from 'obsidian';
import { getTimeZone } from 'settings/ui/CustomTimeZone.ts';
import { getDayStartTime } from 'settings/ui/DayStartTime.ts';
import { getUserLocale } from 'settings/validation/userLocale.ts';
import spacetime from 'spacetime';
import { applyDayStartTimeSetting } from 'timeUtils.ts';
import { ChangelogInterval } from 'types.ts';
import { getFileNameFromPath, isMoved, isRenamed } from 'utils.ts';

export function composeAriaLabel(file: DiffFile): string {
  try {
    let ariaString = '';
    if (isMoved(file)) {
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      ariaString += file.fromPathGitRelative!;
      ariaString += ' →';
      ariaString += '\n';
      ariaString += file.pathGitRelative;
    } else if (isRenamed(file)) {
      ariaString += getFileNameFromPath({
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        normalizedFilePath: normalizePath(file.fromPathGitRelative!)
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

export function composeDailyVersionDisplayText(
  fullyAdjustedCurrentDate: Spacetime,
  entryDate: Spacetime,
  plugin: GitChangelogPlugin
): string {
  const isToday = entryDate.isSame(fullyAdjustedCurrentDate, 'day');
  const isYesterday = entryDate.isSame(
    fullyAdjustedCurrentDate.clone().subtract(1, 'days'),
    'day'
  );

  if (isToday) {
    return 'Today';
  }
  if (isYesterday) {
    return 'Yesterday';
  }

  return formatDate(entryDate.toNativeDate(), getUserLocale(plugin));
}

export function composeHourlyVersionDisplayText(
  fullyAdjustedCurrentDate: Spacetime,
  entryDate: Spacetime,
  plugin: GitChangelogPlugin
): string {
  const isToday = entryDate.isSame(fullyAdjustedCurrentDate, 'day');
  const isYesterday = entryDate.isSame(
    fullyAdjustedCurrentDate.clone().subtract(1, 'days'),
    'day'
  );

  const userLocale = getUserLocale(plugin);

  // Replaces the date part of the date time string with today or yesterday labels.
  if (isToday || isYesterday) {
    const timeFormatter = new Intl.DateTimeFormat(userLocale, {
      timeStyle: 'short'
    });
    const timeString = timeFormatter.format(
      entryDate.startOf('hour').toNativeDate()
    );
    return `${isToday ? 'Today' : 'Yesterday'}, ${timeString}`;
  }

  return formatDateWithHour(
    entryDate.startOf('hour').toNativeDate(),
    userLocale
  );
}

export function composeMonthlyVersionDisplayText(
  entryDate: Spacetime,
  plugin: GitChangelogPlugin
): string {
  return formatMonthYear(entryDate.toNativeDate(), getUserLocale(plugin));
}

export function composeVersionTitle({
  interval,
  plugin,
  timezoneAdjustedEntryDate
}: {
  interval: ChangelogInterval;
  plugin: GitChangelogPlugin;
  timezoneAdjustedEntryDate: Spacetime;
}): string {
  const timezoneAdjustedCurrentDate = spacetime(
    new Date(),
    getTimeZone(plugin.settings.changelogGenerationSettings, plugin)
  );
  const fullyAdjustedCurrentDate = applyDayStartTimeSetting({
    dayStartTime: getDayStartTime(plugin.settings.changelogGenerationSettings),
    timezoneAdjustedDate: timezoneAdjustedCurrentDate
  });

  const fullyAdjustedEntryDate = applyDayStartTimeSetting({
    dayStartTime: getDayStartTime(plugin.settings.changelogGenerationSettings),
    timezoneAdjustedDate: timezoneAdjustedEntryDate
  });

  switch (interval) {
    case ChangelogInterval.Hourly: {
      return composeHourlyVersionDisplayText(
        timezoneAdjustedCurrentDate,
        timezoneAdjustedEntryDate,
        plugin
      );
    }
    case ChangelogInterval.Monthly: {
      return composeMonthlyVersionDisplayText(fullyAdjustedEntryDate, plugin);
    }
    case ChangelogInterval.Weekly: {
      return composeWeeklyVersionDisplayText({
        fullyAdjustedCurrentDate,
        fullyAdjustedEntryDate,
        plugin
      });
    }
    default: {
      return composeDailyVersionDisplayText(
        fullyAdjustedCurrentDate,
        fullyAdjustedEntryDate,
        plugin
      );
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
  const entryWeek = fullyAdjustedEntryDate.startOf('week');

  // In order for this to be accurate we need to normalize the dates to the start of the interval, which is a week here. If comparing would be based on what the actual commit date is of the current version is, instead of that interval that version belongs to, the diffs would be inconsistent because e.g. when comparing the latest version with the latest commit on thursday with the previous version that had it's last commit on wednesday, the diff would count 2 weeks difference instead of 1.
  const weeksDifference = entryWeek.diff(
    fullyAdjustedCurrentDate.startOf('week'),
    'weeks'
  );

  if (weeksDifference === 0) {
    return 'This week';
  }
  if (weeksDifference === 1) {
    return 'Last week';
  }

  const userLocale = getUserLocale(plugin);

  const weekNumber = fullyAdjustedEntryDate.week();

  const isCurrentYear = fullyAdjustedEntryDate.isSame(
    fullyAdjustedCurrentDate,
    'year'
  );

  const nativeEntryWeek = entryWeek.toNativeDate();

  if (isCurrentYear) {
    const monthString = new Intl.DateTimeFormat(userLocale, {
      month: 'short'
    }).format(nativeEntryWeek);
    return `Week ${weekNumber}, ${monthString}`;
  }

  const monthAndYearString = new Intl.DateTimeFormat(userLocale, {
    month: 'short',
    year: '2-digit'
  }).format(nativeEntryWeek);

  return `Week ${weekNumber}, ${monthAndYearString}`;
}

export function formatDate(date: Date, locale: string): string {
  const formatter = new Intl.DateTimeFormat(locale);
  return formatter.format(date);
}

export function formatDateWithHour(date: Date, locale: string): string {
  const formatter = new Intl.DateTimeFormat(locale, {
    dateStyle: 'short',
    timeStyle: 'short'
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

export function formatMonthYear(date: Date, locale: string): string {
  return new Intl.DateTimeFormat(locale, {
    month: 'long',
    year: 'numeric'
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
