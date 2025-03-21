import type { SliderComponent } from 'obsidian';
import type { ChangelogGenerationSettings } from 'settings/settings.ts';

import { ResetButton } from 'settings/components/resetButton.ts';
import { GitChangelogSetting } from 'settings/components/setting.ts';
import { DEFAULT_SETTINGS } from 'settings/settings.ts';

const MIN_RENAME_DETECTION_STRICTNESS = 1;
const MAX_RENAME_DETECTION_STRICTNESS = 100;

export class RenameDetectionStrictnessSlider extends GitChangelogSetting {
  public display(): void {
    let slider: SliderComponent;
    const setting = this.createSetting()
      .setName('File move/rename detection strictness')
      .setDesc(
        "Flag files as renamed only if more than X% of the file hasn't changed. Adjust this if you notice the plugin missing valid moves/renames or showing false positives."
      );

    new ResetButton(setting.controlEl).onClick(() => {
      slider.setValue(
        DEFAULT_SETTINGS.changelogGenerationSettings.renameDetectionStrictness
      );
    });

    setting.addSlider((percent) => {
      slider = percent;

      percent
        .setValue(
          getRenameDetectionStrictness(
            this.plugin.settings.changelogGenerationSettings
          )
        )
        .setLimits(
          MIN_RENAME_DETECTION_STRICTNESS,
          MAX_RENAME_DETECTION_STRICTNESS,
          1
        )
        .onChange((value) => {
          const newSettings = this.plugin.settingsClone;
          newSettings.changelogGenerationSettings.renameDetectionStrictness =
            value;
          // eslint-disable-next-line @typescript-eslint/no-floating-promises
          this.plugin.saveSettings(newSettings);
        })
        .setDynamicTooltip();
    });
  }
}

export function getRenameDetectionStrictness(
  changelogGenerationSettings: ChangelogGenerationSettings
): number {
  if (
    !Number.isInteger(changelogGenerationSettings.renameDetectionStrictness) ||
    changelogGenerationSettings.renameDetectionStrictness <
      MIN_RENAME_DETECTION_STRICTNESS ||
    changelogGenerationSettings.renameDetectionStrictness >
      MAX_RENAME_DETECTION_STRICTNESS
  ) {
    return DEFAULT_SETTINGS.changelogGenerationSettings
      .renameDetectionStrictness;
  }

  return changelogGenerationSettings.renameDetectionStrictness;
}
