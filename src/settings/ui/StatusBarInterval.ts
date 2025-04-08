import { SettingComponent } from 'settings/components/setting.ts';

export class StatusBarInterval extends SettingComponent {
  public display(): void {
    this.createSetting()
      .setName('Interval for status bar stats (minutes)')
      .setDesc(
        'Works by comparing the live file version against the first commit before the interval.'
      )
      .addNumber((text) => {
        this.settingTab.bind(text, 'statusBarInterval', {
          shouldShowValidationMessage: false
        });

        text.setDisabled(this.disabled);
      });
  }
}
