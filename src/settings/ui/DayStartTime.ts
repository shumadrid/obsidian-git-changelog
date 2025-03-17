import type { ChangelogGenerationSettings } from 'settings/settings.ts';

import { moment } from 'obsidian';
import { GitChangelogSetting } from 'settings/components/setting.ts';
import { DEFAULT_SETTINGS } from 'settings/settings.ts';

export class DayStartTime extends GitChangelogSetting {
  public display(): void {
    this.createSetting()
      .setName('Day start time')
      .setDesc('Adjust the day based on your schedule.')
      .addTime((text) => {
        text
          .setValue(
            moment.duration({
              minutes:
                this.plugin.settings.changelogGenerationSettings.dayStartTime
            })
          )
          .onChange((value) => {
            const newSettings = this.plugin.settingsClone;
            newSettings.changelogGenerationSettings.dayStartTime =
              value.asMinutes();
            // eslint-disable-next-line @typescript-eslint/no-floating-promises
            this.plugin.saveSettings(newSettings);
          });
      });
  }
}

export function getDayStartTime(
  changelogGenerationSettings: ChangelogGenerationSettings
): number {
  return validateDayStartTime(changelogGenerationSettings.dayStartTime)
    ? changelogGenerationSettings.dayStartTime
    : DEFAULT_SETTINGS.changelogGenerationSettings.dayStartTime;
}

export const ONE_DAY_IN_MINUTES = 1440;

export function validateDayStartTime(dayStartTime: number): boolean {
  if (
    !Number.isInteger(dayStartTime) ||
    dayStartTime < 0 ||
    dayStartTime >= ONE_DAY_IN_MINUTES
  ) {
    return false;
  }
  return true;
}
