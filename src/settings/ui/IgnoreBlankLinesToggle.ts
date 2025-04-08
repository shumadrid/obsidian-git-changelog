import { SettingComponent } from 'settings/components/setting.ts';

export class IgnoreBlankLinesToggle extends SettingComponent {
  public display(): void {
    this.createSetting()
      .setName(
        createFragment((fragment) => {
          fragment.appendText(`Ignore blank lines`);
          fragment
            .createEl('span', { cls: 'nav-file-tag git-changelog-new' })
            .setText('NEW');
        })
      )
      .setDesc('Ignore the additions and removals of completely empty lines.')
      .addToggle((toggle) =>
        this.settingTab.bind(toggle, 'ignoreBlankLines', {
          shouldShowValidationMessage: false
        })
      );
  }
}
