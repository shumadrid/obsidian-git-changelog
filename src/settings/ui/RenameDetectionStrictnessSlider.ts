import {
  MAX_RENAME_DETECTION_STRICTNESS,
  MIN_RENAME_DETECTION_STRICTNESS
} from 'constants.ts';
import { ResetButton } from 'settings/components/resetButton.ts';
import { SettingComponent } from 'settings/components/setting.ts';

export class RenameDetectionStrictnessSlider extends SettingComponent {
  public display(): void {
    const setting = this.createSetting()
      .setName('File move/rename detection strictness')
      .setDesc(
        createFragment((fragment) => {
          fragment.appendText(
            `Flag files as renamed only if more than X% of the file hasn't changed.`
          );
          fragment.createEl('br');
          fragment.appendText(
            'Adjust this if you notice the plugin missing valid moves/renames or showing false positives.'
          );
        })
      );

    new ResetButton(setting.controlEl).onClick(() => {
      const settingProperty = this.plugin.settingsManager.getProperty(
        'renameDetectionStrictness'
      );
      settingProperty.setValue(settingProperty.defaultValue);
      this.refreshDisplayWithDelay();
    });

    setting.addSlider((percent) => {
      this.settingTab.bind(percent, 'renameDetectionStrictness', {
        shouldShowValidationMessage: false
      });

      percent
        .setLimits(
          MIN_RENAME_DETECTION_STRICTNESS,
          MAX_RENAME_DETECTION_STRICTNESS,
          1
        )
        .setDynamicTooltip();
    });
  }
}
