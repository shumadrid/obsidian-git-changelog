import { EXCLUDE_FILES_AND_FOLDERS } from 'constants.ts';
import { appendCodeBlock } from 'obsidian-dev-utils/HTMLElement';
import { SettingComponent } from 'settings/components/setting.ts';

export class IncludeItemsToggle extends SettingComponent {
  public display(): void {
    this.createSetting()
      .setName(
        createFragment((fragment) => {
          fragment.appendText(`Include items instead`);
          fragment.createEl('span', { cls: 'nav-file-tag git-changelog-new' });
        })
      )
      .setDesc(
        createFragment((fragment) => {
          fragment.appendText('Include the items listed in ');
          appendCodeBlock(fragment, EXCLUDE_FILES_AND_FOLDERS);
          fragment.appendText(
            ` instead of excluding them, and exclude everything else.`
          );
        })
      )
      .addToggle((toggle) =>
        this.settingTab.bind(toggle, 'convertToIncludeList')
      );
  }
}
