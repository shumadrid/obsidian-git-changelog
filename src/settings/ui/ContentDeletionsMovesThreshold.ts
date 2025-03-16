import { GitChangelogSetting } from 'settings/components/setting.ts';
import { DEFAULT_SETTINGS } from 'settings/settings.ts';

export class ContentDeletionsMovesThreshold extends GitChangelogSetting {
  public display(): void {
    this.createSetting()
      .setName('Custom threshold for deletions/moves alert')
      .setDesc(
        "Acceptable amount of deletions and moves between commits. Represents either words or lines, depending on your setup. Note that this doesn't mean between each interval but between the actual commits, meaning if your auto-commit interval is five minutes, this will trigger only if you manage to delete that many files inside those five minutes, which usually signals corruption or data loss."
      )
      .addText((text) => {
        text.setDisabled(this.disabled).onChange((value) => {
          const newSettings = this.plugin.settingsClone;
          newSettings.contentDeletionsAndMovesWarningThreshold =
            validateContentDeletionsMovesThreshold(value)
              ? value
              : DEFAULT_SETTINGS.contentDeletionsAndMovesWarningThreshold;
          // eslint-disable-next-line @typescript-eslint/no-floating-promises
          this.plugin.saveSettings(newSettings);
        });
        // This.restrictToPositiveIntegerInput(text);

        this.setValueIfNonDefaultSetting({
          settingsProperty: 'contentDeletionsAndMovesWarningThreshold',
          text
        });
      });
  }
}

export function validateContentDeletionsMovesThreshold(
  contentDeletionsMovesThreshold: string
): boolean {
  if (
    !Number.isInteger(Number(contentDeletionsMovesThreshold)) ||
    Number(contentDeletionsMovesThreshold) < 1
  ) {
    return false;
  }
  return true;
}
