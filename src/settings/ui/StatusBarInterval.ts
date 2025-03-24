import type { GitChangelogPluginSettings } from 'settings/settings.ts';
import type { ReadonlyDeep } from 'type-fest';

import { GitChangelogSetting } from 'settings/components/setting.ts';
import { DEFAULT_SETTINGS, MAX_SUPPORTED_INTERVAL } from 'settings/settings.ts';

export class StatusBarInterval extends GitChangelogSetting {
  public display(): void {
    this.createSetting()
      .setName('Interval for status bar stats (minutes)')
      .setDesc(
        'Works by comparing the live file version against the first commit before the interval.'
      )
      .addText((text) => {
        text.inputEl.pattern = '[1-9][0-9]*';
        text.inputEl.maxLength = MAX_SUPPORTED_INTERVAL.toString().length;
        text.inputEl.inputMode = 'numeric';
        text
          .setDisabled(this.disabled)
          .setPlaceholder(DEFAULT_SETTINGS.statusBarInterval)
          .onChange((value) => {
            const newSettings = this.plugin.settingsClone;
            newSettings.statusBarInterval = validateStatusBarInterval(
              String(value)
            )
              ? String(value)
              : DEFAULT_SETTINGS.statusBarInterval;
            // eslint-disable-next-line @typescript-eslint/no-floating-promises
            this.plugin.saveSettings(newSettings);
          });

        this.setNonDefaultValue({
          settingsProperty: 'statusBarInterval',
          text
        });
      });
  }
}

export function getStatusBarInterval(
  settings: ReadonlyDeep<GitChangelogPluginSettings>
): number {
  if (!validateStatusBarInterval(settings.statusBarInterval)) {
    return Number(DEFAULT_SETTINGS.statusBarInterval);
  }
  return Number(settings.statusBarInterval);
}

export function validateStatusBarInterval(
  statusBarAlternateInterval: string
): boolean {
  if (
    !Number.isInteger(Number(statusBarAlternateInterval)) ||
    Number(statusBarAlternateInterval) < 1 ||
    Number(statusBarAlternateInterval) > MAX_SUPPORTED_INTERVAL
  ) {
    return false;
  }
  return true;
}
