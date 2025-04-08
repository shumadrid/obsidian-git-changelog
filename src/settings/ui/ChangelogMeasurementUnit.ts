import { SettingComponent } from 'settings/components/setting.ts';
import { DiffMeasurementUnit } from 'types.ts';

export class ChangelogMeasurementUnit extends SettingComponent {
  public display(): void {
    this.createSetting()
      .setName('Changelog measurement unit')
      .addTypedDropdown((dropdown) => {
        dropdown.addOption(DiffMeasurementUnit.Lines, 'Lines');
        dropdown.addOption(DiffMeasurementUnit.Words, 'Words');
        this.settingTab.bind(dropdown, 'diffMeasurementUnit', {
          shouldShowValidationMessage: false
        });
      });
  }
}
