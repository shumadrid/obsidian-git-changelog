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
      const defaultValue =
        this.plugin.settingsManager.defaultSettings.renameDetectionStrictness;

      // It saves to file, which we don't want to wait for
      // eslint-disable-next-line @typescript-eslint/no-floating-promises
      this.plugin.settingsManager.setProperty(
        'renameDetectionStrictness',
        defaultValue
      );
      this.refreshDisplayWithDelay(0);
    });

    setting.addSlider((percent) => {
      this.settingTab.bind(percent, 'renameDetectionStrictness');

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
