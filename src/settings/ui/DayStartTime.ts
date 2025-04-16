import { moment } from 'obsidian';
import { SettingComponent } from 'settings/components/setting.ts';

export class DayStartHour extends SettingComponent {
  public display(): void {
    this.createSetting()
      .setName('Day start time')
      .setDesc(
        'Adjust the day based on your schedule. Applies exclusively to the day interval in the changelog views.'
      )
      .addTime((text) => {
        this.settingTab.bind(text, 'dayStartHour', {
          componentToPluginSettingsValueConverter: (
            uiValue: moment.Duration
          ) => {
            // Clip any minutes. The smallest possible interval is an hour and this value should be clipped to that.
            // Allowing the day start time to be specified in minutes doesn't make sense because then e.g. you would need to handle the half an hour that belongs to the previous day and the other half an hour that belongs to the next day separately.
            return uiValue.hours();
          },
          onChanged: (value) => {
            text.setValue(moment.duration(value, 'hours'));
          },
          shouldShowValidationMessage: false,
          shouldShowPlaceholderForDefaultValues: false,
          pluginSettingsToComponentValueConverter: (
            pluginSettingsValue: number
          ) => moment.duration(pluginSettingsValue, 'hours')
        });
        // eslint-disable-next-line no-magic-numbers
        text.setStep(3600);
      });
  }
}
