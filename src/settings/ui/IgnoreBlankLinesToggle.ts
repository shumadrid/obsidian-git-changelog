import { GitChangelogSetting } from 'settings/components/setting.ts';

export class IgnoreBlankLinesToggle extends GitChangelogSetting {
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
        toggle
          .setValue(
            this.plugin.settings.changelogGenerationSettings.ignoreBlankLines
          )
          .onChange((value) => {
            const newSettings = this.plugin.settingsClone;
            newSettings.changelogGenerationSettings.ignoreBlankLines = value;
            // eslint-disable-next-line @typescript-eslint/no-floating-promises
            this.plugin.saveSettings(newSettings);
          })
      );
  }
}
