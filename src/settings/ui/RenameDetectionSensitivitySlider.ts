import type { SliderComponent } from 'obsidian';
import type { ChangelogGenerationSettings } from 'settings/settings.ts';

import { ResetButton } from 'settings/components/resetButton.ts';
import { GitChangelogSetting } from 'settings/components/setting.ts';
import { DEFAULT_SETTINGS } from 'settings/settings.ts';

const MIN_RENAME_DETECTION_SENSITIVITY = 1;
const MAX_RENAME_DETECTION_SENSITIVITY = 100;

export class RenameDetectionSensitivitySlider extends GitChangelogSetting {
  public display(): void {
    let slider: SliderComponent;
    const setting = this.createSetting()
      .setName('File move/rename detection sensitivity')
      .setDesc(
        "Flag files as renamed only if more than X% of the file hasn't changed. Adjust this if you notice the plugin missing valid moves/renames or showing false positives."
      );

    new ResetButton(setting.controlEl).onClick(() => {
      slider.setValue(
        DEFAULT_SETTINGS.changelogGenerationSettings.renameDetectionSensitivity
      );
    });

    setting.addSlider((percent) => {
      slider = percent;

      percent
        .setValue(
          getRenameDetectionSensitivity(
            this.plugin.settings.changelogGenerationSettings
          )
        )
        .setLimits(
          MIN_RENAME_DETECTION_SENSITIVITY,
          MAX_RENAME_DETECTION_SENSITIVITY,
          1
        )
        .onChange((value) => {
          const newSettings = this.plugin.settingsClone;
          newSettings.changelogGenerationSettings.renameDetectionSensitivity =
            value;
          // eslint-disable-next-line @typescript-eslint/no-floating-promises
          this.plugin.saveSettings(newSettings);
        })
        .setDynamicTooltip();
    });
  }
}

export function getRenameDetectionSensitivity(
  changelogGenerationSettings: ChangelogGenerationSettings
): number {
  if (
    !Number.isInteger(changelogGenerationSettings.renameDetectionSensitivity) ||
    changelogGenerationSettings.renameDetectionSensitivity <
      MIN_RENAME_DETECTION_SENSITIVITY ||
    changelogGenerationSettings.renameDetectionSensitivity >
      MAX_RENAME_DETECTION_SENSITIVITY
  ) {
    return DEFAULT_SETTINGS.changelogGenerationSettings
      .renameDetectionSensitivity;
  }

  return changelogGenerationSettings.renameDetectionSensitivity;
}
