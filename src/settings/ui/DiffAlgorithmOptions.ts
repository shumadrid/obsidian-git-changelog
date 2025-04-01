import type GitChangelogPlugin from 'main.ts';
import type { ChangelogGenerationSettings } from 'settings/settings.ts';

import { appendCodeBlock } from 'obsidian-dev-utils/HTMLElement';
import { GitChangelogSetting } from 'settings/components/setting.ts';
import { DEFAULT_SETTINGS } from 'settings/settings.ts';
import { DiffAlgorithm } from 'types.ts';

const GIT_CONFIG_PATH = '.git/config';

export class DiffAlgorithmOptions extends GitChangelogSetting {
  public display(): void {
    this.createSetting()
      .setName('Difference detection algorithm')
      .setDesc(
        createFragment((fragment) => {
          fragment.appendText(
            `For consistency with the unified Diff view and other git operations, it's recommended to also `
          );
          appendCodeBlock(fragment, 'Apply');
          fragment.appendText(` the custom algorithm to `);
          appendCodeBlock(fragment, GIT_CONFIG_PATH);
          fragment.appendText(`.`);
        })
      )
      .addButton((button) => {
        button.setButtonText('Apply');
        button.setDisabled(shouldDisableApplyButton(this.plugin));
        button.onClick(async () => {
          const diffAlgorithm = getDiffAlgorithm(
            this.plugin.settings.changelogGenerationSettings
          );
          if (diffAlgorithm !== DiffAlgorithm.Inherit) {
            try {
              const git = await this.plugin.getGit();
              await git.addConfig('diff.algorithm', diffAlgorithm);
              this.plugin.displayNotice(
                `Successfully applied "${diffAlgorithm}" diff algorithm to ${GIT_CONFIG_PATH}.`
              );
            } catch (error) {
              this.plugin.displayError(
                `Failed to apply diff algorithm to git config. ${error}`
              );
            }
          }
        });
      })
      .addDropdown((dropdown) => {
        const options = {
          [DiffAlgorithm.Inherit]: 'Inherit git config',
          [DiffAlgorithm.Default]: 'Default (Faster)',
          [DiffAlgorithm.Minimal]: 'Minimal (More precise)'
        } as const;
        dropdown.addOptions(options);

        dropdown.setValue(
          getDiffAlgorithm(this.plugin.settings.changelogGenerationSettings)
        );

        dropdown.onChange((value: DiffAlgorithm) => {
          const newSettings = this.plugin.settingsClone;
          newSettings.changelogGenerationSettings.diffAlgorithm = value;
          // eslint-disable-next-line @typescript-eslint/no-floating-promises
          this.plugin.saveSettings(newSettings).then(() => {
            // eslint-disable-next-line no-magic-numbers
            this.refreshDisplayWithDelay(30);
          });
        });
      });
  }
}

function shouldDisableApplyButton(plugin: GitChangelogPlugin): boolean {
  const diffAlgorithm = getDiffAlgorithm(
    plugin.settings.changelogGenerationSettings
  );
  if (diffAlgorithm === DiffAlgorithm.Inherit) {
    return true;
  }
  return false;
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
