import { SettingComponent } from 'settings/components/setting.ts';

// https://github.com/git/git/blob/58b5801aa94ad5031978f8e42c1be1230b3d352f/diff.c#L58 - 1000 default
export class RenameDetectionFileLimit extends SettingComponent {
  public display(): void {
    this.createSetting()

      .setName('Rename detection file limit')
      .setDesc(
        createFragment((fragment) => {
          fragment.appendText(
            'If number of changed files exceeds the limit, exhaustive rename detection won’t run, though some renames may still be detected.'
          );
          fragment.createEl('br');
          fragment.appendText(
            'Be aware of potential computation costs when setting higher limits. Set 0 for no limit.'
          );
        })
      )
      .addNumber((text) => {
        this.settingTab.bind(text, 'renameLimit', {
          shouldShowValidationMessage: false
        });
      });
  }
}
