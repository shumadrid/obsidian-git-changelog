import type { ChangelogGenerationSettings } from 'settings/settings.ts';

import { GitChangelogSetting } from 'settings/components/setting.ts';
import { DEFAULT_SETTINGS } from 'settings/settings.ts';
import { DiffMeasurementUnit } from 'types.ts';

export class ChangelogMeasurementUnit extends GitChangelogSetting {
  public display(): void {
    this.createSetting()
      .setName('Changelog measurement unit')
      .addDropdown((dropdown) => {
        const options: Record<DiffMeasurementUnit, string> = {
          Lines: 'Lines',
          Words: 'Words'
        };
        dropdown.addOptions(options);
        dropdown.setValue(
          getMeasurementUnit(this.plugin.settings.changelogGenerationSettings)
        );

        dropdown.onChange((value: string) => {
          const option =
            DiffMeasurementUnit[value as keyof typeof DiffMeasurementUnit];

          const newSettings = this.plugin.settingsClone;
          newSettings.changelogGenerationSettings.measurementUnit = option;
          // eslint-disable-next-line @typescript-eslint/no-floating-promises
          this.plugin.saveSettings(newSettings);
        });
      });
  }
}
export function getMeasurementUnit(
  changelogGenerationSettings: ChangelogGenerationSettings
): DiffMeasurementUnit {
  return DiffMeasurementUnit.Lines;
  if (!validateMeasurementUnit(changelogGenerationSettings.measurementUnit)) {
    return DEFAULT_SETTINGS.changelogGenerationSettings.measurementUnit;
  }

  return changelogGenerationSettings.measurementUnit;
}

export function validateMeasurementUnit(
  measurementUnit: DiffMeasurementUnit
): boolean {
  if (Object.values(DiffMeasurementUnit).includes(measurementUnit)) {
    return true;
  }
  return false;
}
