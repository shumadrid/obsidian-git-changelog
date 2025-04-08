import type GitChangelogPlugin from 'main.ts';

import { SettingComponent } from 'settings/components/setting.ts';
import { TimeZoneSuggest } from 'settings/components/suggest.ts';
import { TIME_ZONES_LIST } from 'settings/settings.ts';

export class CustomTimeZone extends SettingComponent {
  public display(): void {
    this.createSetting()
      .setName('Timezone')
      .addText((text) => {
        this.settingTab.bind(text, 'timeZone', {
          shouldShowValidationMessage: false
        });

        new TimeZoneSuggest(this.plugin.app, text.inputEl);
      });
  }
}

function getSystemTimeZone(plugin: GitChangelogPlugin): string {
  if (plugin.detectedTimeZone === undefined) {
    // Detect the system time zone using Intl API and save it for the current Obsidian session.
    const systemTimeZone = Intl.DateTimeFormat()
      .resolvedOptions()
      .timeZone.toLowerCase();

    if (validateCustomTimeZone(systemTimeZone)) {
      plugin.detectedTimeZone = systemTimeZone;
    } else {
      plugin.displayNotice(
        "Couldn't detect a valid system time zone: Obsidian installer version might be too old.\nFallback to UTC."
      );
      plugin.detectedTimeZone = 'utc';
    }
  }

  return plugin.detectedTimeZone;
}

export function getTimeZone(plugin: GitChangelogPlugin): string {
  return plugin.settings.timeZone ===
    plugin.settingsManager.getProperty('timeZone').defaultValue
    ? getSystemTimeZone(plugin)
    : plugin.settings.timeZone;
}

export function validateCustomTimeZone(timeZone: string): boolean {
  return TIME_ZONES_LIST.has(timeZone.toLowerCase());
}
