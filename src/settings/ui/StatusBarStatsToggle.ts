import { SettingComponent } from 'settings/components/setting.ts';

export class StatusBarStatsToggle extends SettingComponent {
  public display(): void {
    this.createSetting()
      .setName('Active note live status bar stats')
      .addToggle((toggle) => {
        this.settingTab.bind(toggle, 'showStatusBarStats', {
          shouldShowValidationMessage: false,
          onChanged: () => {
            this.refreshDisplayWithDelay();
          }
        });
      });
  }
}
