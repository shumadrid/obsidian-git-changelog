import { SettingComponent } from 'settings/components/setting.ts';

export class DeletionsNotificationThreshold extends SettingComponent {
  public display(): void {
    this.createSetting()
      .setName('Notify on large amount of changes.')
      .setDesc(
        'Notify if changes between neighboring commits exceed a threshold, which can be a sign of data loss or corruption.'
      )
      .addToggle((toggle) => {
        this.settingTab.bind(toggle, 'notifyOnHighContentDeletionsAndMoves', {
          shouldShowValidationMessage: false,
          onChanged: () => {
            this.refreshDisplayWithDelay();
          }
        });
      });
  }
}
