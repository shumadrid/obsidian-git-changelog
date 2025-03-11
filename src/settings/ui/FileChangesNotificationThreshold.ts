import { GitChangelogSetting } from 'settings/components/setting.ts';
import { DEFAULT_SETTINGS } from 'settings/settings.ts';

export class FileChangesNotificationThreshold extends GitChangelogSetting {
  public display(): void {
    this.createSetting()
      .setName('Custom threshold for file changes alert')

      .addText((text) => {
        text.setDisabled(this.disabled).onChange((value) => {
          const newSettings = this.plugin.settingsClone;
          newSettings.contentDeletionsAndMovesWarningThreshold =
            validateFileChangesNotificationThreshold(value)
              ? value
              : DEFAULT_SETTINGS.contentDeletionsAndMovesWarningThreshold;
          // eslint-disable-next-line @typescript-eslint/no-floating-promises
          this.plugin.saveSettings(newSettings);
        });
        // This.restrictToPositiveIntegerInput(text);

        this.setValueIfNonDefaultSetting({
          settingsProperty: 'filesChangesWarningThreshold',
          text
        });
      });
  }
}

export function validateFileChangesNotificationThreshold(
  fileChangesNotificationThreshold: string
): boolean {
  if (
    !Number.isInteger(Number(fileChangesNotificationThreshold)) ||
    Number(fileChangesNotificationThreshold) < 1
  ) {
    return false;
  }
  return true;
}
