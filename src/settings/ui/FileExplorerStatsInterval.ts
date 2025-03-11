import { GitChangelogSetting } from 'settings/components/setting.ts';
import { DEFAULT_SETTINGS, MAX_SUPPORTED_INTERVAL } from 'settings/settings.ts';

export class FileExplorerStatsInterval extends GitChangelogSetting {
  public display(): void {
    this.createSetting()

      .setName('Interval for File explorer stats (minutes)')
      .setDesc(
        'If specified, generates stats instead of relying on stats from the Changelog view.'
      )
      .addText((text) => {
        text.setDisabled(this.disabled).onChange((value) => {
          const newSettings = this.plugin.settingsClone;
          newSettings.fileExplorerInterval = validateFileExplorerStatsInterval(
            value
          )
            ? value
            : DEFAULT_SETTINGS.fileExplorerInterval;
          // eslint-disable-next-line @typescript-eslint/no-floating-promises
          this.plugin.saveSettings(newSettings);
        });

        // This.restrictToPositiveIntegerInput(text, 5);
        this.setValueIfNonDefaultSetting({
          settingsProperty: 'fileExplorerInterval',
          text
        });
      });
  }
}

export function validateFileExplorerStatsInterval(
  fileExplorerStatsInterval: string
): boolean {
  if (
    !Number.isInteger(Number(fileExplorerStatsInterval)) ||
    Number(fileExplorerStatsInterval) < 1 ||
    Number(fileExplorerStatsInterval) > MAX_SUPPORTED_INTERVAL
  ) {
    return false;
  }
  return true;
}
