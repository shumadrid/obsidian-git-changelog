import { SettingComponent } from 'settings/components/setting.ts';

export class FileExplorerStatsInterval extends SettingComponent {
  public display(): void {
    this.createSetting()
      .setName('Interval for file explorer stats (minutes)')
      .addText((text) => {
        this.settingTab.bind(text, 'fileExplorerInterval', {
          shouldShowValidationMessage: false
        });

        text.setDisabled(this.disabled);
      });
  }
}
