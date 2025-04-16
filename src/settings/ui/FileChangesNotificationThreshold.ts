import { SettingComponent } from 'settings/components/setting.ts';

export class FileChangesNotificationThreshold extends SettingComponent {
  public display(): void {
    this.createSetting()
      .setName('Custom threshold for file changes alert')
      .addText((text) => {
        this.settingTab.bind(text, 'filesChangedWarningThreshold');

        text.setDisabled(this.disabled);

        // This.restrictToPositiveIntegerInput(text);
      });
  }
}
