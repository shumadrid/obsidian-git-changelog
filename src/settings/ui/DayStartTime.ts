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
              hours:
                this.plugin.settings.changelogGenerationSettings.dayStartHour
            })
          )
          .onChange((value) => {
            // Clip any minutes. The smallest possible interval is an hour and this value should be clipped to that.
            // Allowing the day start time to be specified in minutes doesn't make sense because then you would need to handle the half an hour that belongs to the previous day and the other half an hour that belongs to the next day separately.
            text.setValue(
              moment.duration({
                hours: value.hours()
              })
            );

            const newSettings = this.plugin.settingsClone;
            newSettings.changelogGenerationSettings.dayStartHour =
              value.hours();
            // eslint-disable-next-line @typescript-eslint/no-floating-promises
            this.plugin.saveSettings(newSettings);
          });

        text.inputEl.step = '3600';
      });
  }
}

export function getDayStartTime(
  changelogGenerationSettings: ChangelogGenerationSettings
): number {
  return validateDayStartTime(changelogGenerationSettings.dayStartHour)
    ? changelogGenerationSettings.dayStartHour
    : DEFAULT_SETTINGS.changelogGenerationSettings.dayStartHour;
}

export const ONE_DAY_IN_HOURS = 24;

export function validateDayStartTime(dayStartTime: number): boolean {
  if (
    !Number.isInteger(dayStartTime) ||
    dayStartTime < 0 ||
    dayStartTime >= ONE_DAY_IN_HOURS
  ) {
    return false;
  }
  return true;
}
