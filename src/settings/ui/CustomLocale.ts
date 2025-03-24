import type GitChangelogPlugin from 'main.ts';

import { GitChangelogSetting } from 'settings/components/setting.ts';
import { DEFAULT_SETTINGS } from 'settings/settings.ts';

export class CustomLocale extends GitChangelogSetting {
  public display(): void {
    this.createSetting()
      .setName('Date format locale')
      .setDesc(`Accepts a locale code (e.g. "en-US").`)
      .addText((text) => {
        text.inputEl.maxLength = 30;
        text
          .setPlaceholder(DEFAULT_SETTINGS.changelogGenerationSettings.locale)
          .onChange((value) => {
            const newSettings = this.plugin.settingsClone;
            newSettings.changelogGenerationSettings.locale = value;
            // eslint-disable-next-line @typescript-eslint/no-floating-promises
            this.plugin.saveSettings(newSettings);
          });

        this.setNonDefaultValue({
          settingsProperty: 'changelogGenerationSettings',
          diffSettingsProperty: 'locale',
          text
        });
      });
  }
}

export function getUserLocale(plugin: GitChangelogPlugin): string {
  const locale = plugin.settings.changelogGenerationSettings.locale;
  if (validateLocale(locale)) {
    return locale;
  }
  // Decided against using the new Obsidian language API so that the plugin is compatible with older versions of Obsidian (for now, will update later).
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
