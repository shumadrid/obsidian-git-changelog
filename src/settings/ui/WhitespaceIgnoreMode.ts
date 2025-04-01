import type { ChangelogGenerationSettings } from 'settings/settings.ts';

import { GitChangelogSetting } from 'settings/components/setting.ts';
import { DEFAULT_SETTINGS } from 'settings/settings.ts';
import { WhitespaceIgnoreMode } from 'types.ts';

export class WhitespaceIgnoreModeOptions extends GitChangelogSetting {
  public display(): void {
    this.createSetting()
      .setName(
        createFragment((fragment) => {
          fragment.appendText(`Whitespace changes detection`);
          fragment
            .createEl('span', { cls: 'nav-file-tag git-changelog-new' })
            .setText('NEW');
        })
      )
      .addDropdown((dropdown) => {
        const options = {
          [WhitespaceIgnoreMode.None]: 'Track all whitespace changes',
          [WhitespaceIgnoreMode.SpaceAtEol]:
            'Ignore whitespace changes at end of line',
          [WhitespaceIgnoreMode.SpaceChange]:
            'Ignore changes to pre-existing whitespace',
          [WhitespaceIgnoreMode.AllSpace]: 'Ignore all whitespace changes'
        } as const;
        dropdown.addOptions(options);

        dropdown.setValue(
          getWhitespaceIgnoreMode(
            this.plugin.settings.changelogGenerationSettings
          )
        );

        dropdown.onChange((value: WhitespaceIgnoreMode) => {
          const newSettings = this.plugin.settingsClone;
          newSettings.changelogGenerationSettings.whitespaceIgnoreMode = value;
          // eslint-disable-next-line @typescript-eslint/no-floating-promises
          this.plugin.saveSettings(newSettings);
        });
      });
  }
}

export function getWhitespaceIgnoreMode(
  changelogGenerationSettings: ChangelogGenerationSettings
): WhitespaceIgnoreMode {
  if (
    !Object.values(WhitespaceIgnoreMode).includes(
      changelogGenerationSettings.whitespaceIgnoreMode
    )
  ) {
    return DEFAULT_SETTINGS.changelogGenerationSettings.whitespaceIgnoreMode;
  }

  return changelogGenerationSettings.whitespaceIgnoreMode;
}
