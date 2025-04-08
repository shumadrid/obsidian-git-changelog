import { SettingComponent } from 'settings/components/setting.ts';
import { FileExplorerStats } from 'types.ts';

export class ChangelogStatsInFileExplorerOptions extends SettingComponent {
  public display(): void {
    this.createSetting()
      .setName('Show changelog stats in file explorer')
      .addTypedDropdown((dropdown) => {
        dropdown.addOption(FileExplorerStats.Disabled, 'Disabled');
        dropdown.addOption(FileExplorerStats.Folders, 'Folders');
        dropdown.addOption(
          FileExplorerStats.FoldersAndNotes,
          'Folders and notes'
        );

        this.settingTab.bind(dropdown, 'fileExplorerStats', {
          shouldShowValidationMessage: false,
          onChanged: () => {
            // eslint-disable-next-line no-magic-numbers
            this.refreshDisplayWithDelay(30);
          }
        });
      });
  }
}
