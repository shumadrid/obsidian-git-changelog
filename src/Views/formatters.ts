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
  const hoursDifference = entryDate
    .startOf('hour')
    .diff(fullyAdjustedCurrentDate.startOf('hour'), 'hours');

  if (hoursDifference === 0) {
    return 'This Hour';
  }
  if (hoursDifference === 1) {
    return '1 hour ago';
  }
  // eslint-disable-next-line no-magic-numbers
  if (hoursDifference <= 48) {
    return `${hoursDifference} hours ago`;
  }

  return formatDateWithHour(
    entryDate.startOf('hour').toNativeDate(),
    getUserLocale(plugin)
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
      return composeWeeklyVersionDisplayText(
        fullyAdjustedCurrentDate,
        fullyAdjustedEntryDate
      );
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

export function composeWeeklyVersionDisplayText(
  fullyAdjustedCurrentDate: Spacetime,
  entryDate: Spacetime
): string {
  const weeksDifference = entryDate
    .startOf('week')
    .diff(fullyAdjustedCurrentDate.startOf('week'), 'weeks');

  if (weeksDifference === 0) {
    return 'This Week';
  }
  if (weeksDifference === 1) {
    return '1 week ago';
  }

  return `${weeksDifference.toString()} weeks ago`;
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
