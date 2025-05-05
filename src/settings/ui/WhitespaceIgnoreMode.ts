import { SettingComponent } from 'settings/components/setting.ts';
import { WhitespaceIgnoreMode } from 'types.ts';

export class WhitespaceIgnoreModeOptions extends SettingComponent {
  public display(): void {
    this.createSetting()
      .setName(
        createFragment((fragment) => {
          fragment.appendText(`Whitespace changes detection`);
          fragment.createEl('span', { cls: 'nav-file-tag git-changelog-new' });
        })
      )
      .addTypedDropdown((dropdown) => {
        dropdown.addOption(
          WhitespaceIgnoreMode.None,
          'Track all whitespace changes'
        );
        dropdown.addOption(
          WhitespaceIgnoreMode.SpaceAtEol,
          'Ignore whitespace changes at end of line'
        );
        dropdown.addOption(
          WhitespaceIgnoreMode.SpaceChange,
          'Ignore changes to pre-existing whitespace'
        );
        dropdown.addOption(
          WhitespaceIgnoreMode.AllSpace,
          'Ignore all whitespace changes per line'
        );
        this.settingTab.bind(dropdown, 'whitespaceIgnoreMode');
      });
  }
}
