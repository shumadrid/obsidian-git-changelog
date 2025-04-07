import { EXCLUDE_FILES_AND_FOLDERS } from 'constants.ts';
import { appendCodeBlock } from 'obsidian-dev-utils/HTMLElement';
import { GitChangelogSetting } from 'settings/components/setting.ts';

export class IncludeItemsToggle extends GitChangelogSetting {
  public display(): void {
    this.createSetting()
      .setName(
        createFragment((fragment) => {
          fragment.appendText(`Include items`);
          fragment
            .createEl('span', { cls: 'nav-file-tag git-changelog-new' })
            .setText('NEW');
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
        toggle
          .setValue(
            this.plugin.settings.vaultChangelogGenerationSettings
              .convertToIncludeList
          )
          .onChange((value) => {
            const newSettings = this.plugin.settingsClone;
            newSettings.vaultChangelogGenerationSettings.convertToInclude =
              value;
            // eslint-disable-next-line @typescript-eslint/no-floating-promises
            this.plugin.saveSettings(newSettings);
          })
      );
  }
}
