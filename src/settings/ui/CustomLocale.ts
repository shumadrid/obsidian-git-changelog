import type GitChangelogPlugin from 'main.ts';

import { SettingComponent } from 'settings/components/setting.ts';

export class CustomLocale extends SettingComponent {
  public display(): void {
    this.createSetting()
      .setName('Date format locale')
      .setDesc(`Accepts a locale code (e.g. "en-US").`)
      .addText((text) => {
        text.inputEl.maxLength = 30;

        this.settingTab.bind(text, 'locale', {
          shouldShowValidationMessage: false
        });
      });
  }
}

function getSystemLocale(plugin: GitChangelogPlugin): string {
  if (plugin.detectedLocale === undefined) {
    // Detect the system locale using Intl API and save it for the current Obsidian session.
    const systemLocale = Intl.DateTimeFormat().resolvedOptions().locale;

    if (validateLocale(systemLocale)) {
      plugin.detectedLocale = systemLocale;
    } else {
      new Notice(
        "Couldn't detect a valid system locale: Obsidian installer version might be too old.\nFallback to en-US."
      );
      plugin.detectedLocale = 'en-US';
    }
  }

  return plugin.detectedLocale;
}

export function getLocale(plugin: GitChangelogPlugin): string {
  return plugin.settings.locale ===
    plugin.settingsManager.getProperty('locale').defaultValue
    ? getSystemLocale(plugin)
    : plugin.settings.locale;
}

export function validateLocale(locale: string): boolean {
  try {
    if (!locale || typeof locale !== 'string') {
      return false;
    }
    new Intl.Locale(locale);
    if (Intl.DateTimeFormat.supportedLocalesOf([locale]).length === 0) {
      return false;
    }
  } catch {
    return false;
  }
  return true;
}
