import { SettingComponent } from 'settings/components/setting.ts';

export class IgnoreBlankLinesToggle extends SettingComponent {
  public display(): void {
    this.createSetting()
      .setName(
        createFragment((fragment) => {
          fragment.appendText(`Ignore changes whose lines are all blank`);
        })
      )
      .setDesc(
        "Doesn't show a file as changed if the only changes are blank lines."
      )
      .addToggle((toggle) => this.settingTab.bind(toggle, 'ignoreBlankLines'));
  }
}
