import { GitChangelogSetting } from 'settings/components/setting.ts';
import { DEFAULT_SETTINGS } from 'settings/settings.ts';
import { FileExplorerStats } from 'types.ts';

export class ChangelogStatsInFileExplorerOptions extends GitChangelogSetting {
  public display(): void {
    this.createSetting()
      .setName('Show changelog stats in file explorer')
      .addDropdown((dropdown) => {
        const options = {
          [FileExplorerStats.Disabled]: 'Disabled',
          [FileExplorerStats.Folders]: 'Folders',
          [FileExplorerStats.FoldersAndNotes]: 'Folders and notes'
        };
        dropdown.addOptions(options);
        dropdown.setValue(
          this.plugin.settings.fileExplorerStats ??
            DEFAULT_SETTINGS.fileExplorerStats
        );
        dropdown.onChange((value: FileExplorerStats) => {
          this.refreshDisplayWithDelay(0);

          const newSettings = this.plugin.settingsClone;
          newSettings.fileExplorerStats = value;
          // eslint-disable-next-line @typescript-eslint/no-floating-promises
          this.plugin.saveSettings(newSettings);
        });
      });
  }
}
