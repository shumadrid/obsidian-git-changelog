import type GitChangelogPlugin from 'main.ts';
import type { ChangelogGenerationSettings } from 'settings/settings.ts';

import { Notice } from 'obsidian';
import { GitChangelogSetting } from 'settings/components/setting.ts';
import { TimeZoneSuggest } from 'settings/components/suggest.ts';
import { DEFAULT_SETTINGS, TIME_ZONES_LIST } from 'settings/settings.ts';

export class CustomTimeZone extends GitChangelogSetting {
  public display(): void {
    this.createSetting()
      .setName('Timezone')
      .addText((text) => {
        text
          .setPlaceholder(DEFAULT_SETTINGS.changelogGenerationSettings.timezone)
          .onChange((value) => {
            const newSettings = this.plugin.settingsClone;
            newSettings.changelogGenerationSettings.timezone = value;
            // eslint-disable-next-line @typescript-eslint/no-floating-promises
            this.plugin.saveSettings(newSettings);
          });

        this.setNonDefaultValue({
          diffSettingsProperty: 'timezone',
          settingsProperty: 'changelogGenerationSettings',
          text
        });

        new TimeZoneSuggest(this.plugin.app, text.inputEl);
      });
  }
}

export function detectSystemTimeZone(): string {
  return Intl.DateTimeFormat().resolvedOptions().timeZone.toLowerCase();
}

export function getSystemTimeZone(plugin: GitChangelogPlugin): string {
  if (plugin.detectedTimeZone !== undefined) {
    return plugin.detectedTimeZone;
  }

  const systemTimeZone = detectSystemTimeZone();
  if (validateCustomTimeZone(systemTimeZone)) {
    plugin.detectedTimeZone = systemTimeZone;
  } else {
    new Notice(
      "Couldn't detect a valid system time zone: Obsidian installer version might be too old.\nFallback to UTC."
    );
    plugin.detectedTimeZone = 'utc';
    return 'utc';
  }
  return plugin.detectedTimeZone;
}

export function getTimeZone(
  changelogGenerationSettings: ChangelogGenerationSettings,
  plugin: GitChangelogPlugin
): string {
  return validateCustomTimeZone(changelogGenerationSettings.timezone)
    ? changelogGenerationSettings.timezone
    : getSystemTimeZone(plugin);
}

export function systemTimeZoneUnchanged(plugin: GitChangelogPlugin): boolean {
  const systemTimeZone = detectSystemTimeZone();
  const cachedSystemTimeZone = plugin.detectedTimeZone;
  if (systemTimeZone !== cachedSystemTimeZone) {
    plugin.detectedTimeZone = systemTimeZone;
    return false;
  }
  return true;
}

export function validateCustomTimeZone(timezone: string): boolean {
  return TIME_ZONES_LIST.has(timezone.toLowerCase());
}
