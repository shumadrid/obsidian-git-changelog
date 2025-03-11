import type GitChangelogPlugin from 'main.ts';

export function getUserLocale(plugin: GitChangelogPlugin): string {
  const locale = plugin.settings.locale;
  if (validateLocale(locale)) {
    return locale;
  }
  if (locale) plugin.consoleDebug('Invalid locale:', locale);
  // Decided against using the new Obsidian language API so that the plugin is compatible with older versions of Obsidian (for now).
  return Intl.DateTimeFormat().resolvedOptions().locale;
}

export function validateLocale(locale?: string): boolean {
  try {
    if (!locale || typeof locale !== 'string') {
      return false;
    }
    new Intl.Locale(locale);
    return Intl.DateTimeFormat.supportedLocalesOf([locale]).length > 0;
  } catch {
    return false;
  }
}
