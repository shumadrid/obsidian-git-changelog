import { GitChangelogSetting } from 'settings/components/setting.ts';

export class MiscellaneousButtons extends GitChangelogSetting {
  public display(): void {
    const bugReportDiv = this.createSetting();
    bugReportDiv.addButton((button) => {
      button.setButtonText('Give feedback');
      button.onClick(() => {
        window.open('https://github.com/shumadrid/obsidian-git-changelog');
      });
    });

    bugReportDiv.addButton((button) => {
      button.setButtonText('Copy debug information');
      button.onClick(async () => {
        await globalThis.navigator.clipboard.writeText(
          JSON.stringify(
            {
              gitPluginState: this.plugin.gitPluginState,
              pluginVersion: this.plugin.manifest.version,
              settings: this.plugin.settings
            },
            null,
            // eslint-disable-next-line no-magic-numbers
            4
          )
        );
        this.plugin.displayNotice(
          'Debug information copied to clipboard. May contain sensitive information!'
        );
      });
    });
  }
}
