import type { ChangelogGenerationSettings } from 'settings/settings.ts';

import { GitChangelogSetting } from 'settings/components/setting.ts';
import { DEFAULT_SETTINGS } from 'settings/settings.ts';
import { DiffAlgorithm } from 'types.ts';

export class DiffAlgorithmOptions extends GitChangelogSetting {
  public display(): void {
    this.createSetting()
      .setName('Difference detection algorithm')
      .setDesc(
        "It's recommended to set a custom diff algorithm in git config instead of here, for consistency with the Diff viewer and other plugins."
      )
      .addDropdown((dropdown) => {
        const options: Record<DiffAlgorithm, string> = {
          Default: 'Default (Faster)', // Myers
          Inherit: 'Use git config',
          Minimal: 'Minimal (More precise)'
        };
        dropdown.addOptions(options);

        dropdown.setValue(
          getDiffAlgorithm(this.plugin.settings.changelogGenerationSettings)
        );

        dropdown.onChange((value: string) => {
          const option = DiffAlgorithm[value as keyof typeof DiffAlgorithm];

          const newSettings = this.plugin.settingsClone;
          newSettings.changelogGenerationSettings.diffAlgorithm = option;
          // eslint-disable-next-line @typescript-eslint/no-floating-promises
          this.plugin.saveSettings(newSettings);
        });
      });
  }
}

export function getDiffAlgorithm(
  changelogGenerationSettings: ChangelogGenerationSettings
): DiffAlgorithm {
  if (
    !Object.values(DiffAlgorithm).includes(
      changelogGenerationSettings.diffAlgorithm
    )
  ) {
    return DEFAULT_SETTINGS.changelogGenerationSettings.diffAlgorithm;
  }

  return changelogGenerationSettings.diffAlgorithm;
}
