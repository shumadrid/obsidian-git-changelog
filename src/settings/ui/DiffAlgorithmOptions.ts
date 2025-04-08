import type GitChangelogPlugin from 'main.ts';

import { appendCodeBlock } from 'obsidian-dev-utils/HTMLElement';
import { SettingComponent } from 'settings/components/setting.ts';
import { DiffAlgorithm } from 'types.ts';

const GIT_CONFIG_PATH = '.git/config';

export class DiffAlgorithmOptions extends SettingComponent {
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
          const diffAlgorithm = this.plugin.settings.diffAlgorithm;
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
      .addTypedDropdown((dropdown) => {
        dropdown.addOption(DiffAlgorithm.Inherit, 'Inherit git config');
        dropdown.addOption(DiffAlgorithm.Default, 'Default (Faster)');
        dropdown.addOption(DiffAlgorithm.Minimal, 'Minimal (More precise)');
        this.settingTab.bind(dropdown, 'diffAlgorithm', {
          shouldShowValidationMessage: false,
          onChanged: () => {
            // eslint-disable-next-line no-magic-numbers
            this.refreshDisplayWithDelay(30);
          }
        });
      });
  }
}

function shouldDisableApplyButton(plugin: GitChangelogPlugin): boolean {
  const diffAlgorithm = plugin.settings.diffAlgorithm;
  if (diffAlgorithm === DiffAlgorithm.Inherit) {
    return true;
  }
  return false;
}
