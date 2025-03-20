import type { ChangelogGenerationSettings } from 'settings/settings.ts';

import { GitChangelogSetting } from 'settings/components/setting.ts';
import { DEFAULT_SETTINGS } from 'settings/settings.ts';

// https://github.com/git/git/blob/58b5801aa94ad5031978f8e42c1be1230b3d352f/diff.c#L58 - 1000 default
export class RenameDetectionFileLimit extends GitChangelogSetting {
  public display(): void {
    this.createSetting()

      .setName('Rename detection file limit')
      .setDesc(
        'If number of changed files exceeds the limit, exhaustive rename detection won’t run, though some renames may still be detected. Be aware of potential computation costs when setting higher limits. Set 0 for no limit.'
      )
      .addText((text) => {
        text.inputEl.pattern = '[0-9]*';

        text.inputEl.maxLength = 20;
        text.inputEl.inputMode = 'numeric';
        text
          .setPlaceholder(
            DEFAULT_SETTINGS.changelogGenerationSettings.renameLimit
          )
          .onChange((value) => {
            const newSettings = this.plugin.settingsClone;
            newSettings.changelogGenerationSettings.renameLimit = String(value);
            // eslint-disable-next-line @typescript-eslint/no-floating-promises
            this.plugin.saveSettings(newSettings);
          });
        // This.restrictToPositiveIntegerInput(text);

        this.setValueIfNonDefaultSetting({
          diffSettingsProperty: 'renameLimit',
          settingsProperty: 'changelogGenerationSettings',
          text
        });
      });
  }
}

export function getRenameLimit(
  changelogGenerationSettings: ChangelogGenerationSettings
): number {
  if (!validateRenameLimit(changelogGenerationSettings.renameLimit)) {
    return Number(DEFAULT_SETTINGS.changelogGenerationSettings.renameLimit);
  }

  return Number(changelogGenerationSettings.renameLimit);
}

export function validateRenameLimit(renameLimit: string): boolean {
  return Number(renameLimit) >= 0 && Number.isInteger(renameLimit);
}
