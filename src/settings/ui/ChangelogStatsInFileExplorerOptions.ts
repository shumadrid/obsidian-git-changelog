import { GitChangelogSetting } from 'settings/components/setting.ts';
import { DEFAULT_SETTINGS } from 'settings/settings.ts';
import { FileExplorerStats } from 'types.ts';

export class ChangelogStatsInFileExplorerOptions extends GitChangelogSetting {
  public display(): void {
    this.createSetting()
      .setName('Show changelog stats in file explorer')
      .addDropdown((dropdown) => {
        const options: Record<FileExplorerStats, string> = {
          Disabled: 'Disabled',
          Folders: 'Folders',
          FoldersAndNotes: 'Notes'
        };
        dropdown.addOptions(options);
        dropdown.setValue(
          this.plugin.settings.fileExplorerStats ??
            DEFAULT_SETTINGS.fileExplorerStats
        );
        dropdown.onChange((value: string) => {
          const option =
            FileExplorerStats[value as keyof typeof FileExplorerStats];

          this.refreshDisplaySmooth(0);

          const newSettings = this.plugin.settingsClone;
          newSettings.fileExplorerStats = option;
          // eslint-disable-next-line @typescript-eslint/no-floating-promises
          this.plugin.saveSettings(newSettings);
        });
      });
  }
}
