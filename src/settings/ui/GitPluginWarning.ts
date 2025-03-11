import type { ObsidianGitPlugin } from 'gitPluginTypes.ts';
import type { Setting } from 'obsidian';

import { compareVersions } from 'compare-versions';
import {
  MAX_TESTED_GIT_PLUGIN_VERSION,
  MIN_COMPATIBLE_GIT_PLUGIN_VERSION,
  PLUGIN_NAME
} from 'constants.ts';
import { GitChangelogSetting } from 'settings/components/setting.ts';
import { GitPluginState } from 'types.ts';

export class GitPluginWarning extends GitChangelogSetting {
  public display(): void {
    let desc: DocumentFragment | string;
    let setting: Setting;

    const state = this.plugin.gitPluginState;
    switch (state) {
      case GitPluginState.Enabled: {
        desc = '';
        break;
      }
      case GitPluginState.IncompatibleVersion: {
        desc = '⚠️ The installed Git plugin version is incompatible.';
        break;
      }
      case GitPluginState.UntestedVersion: {
        desc =
          'Compatibility with the installed Git plugin version is not tested.';
        // A button to continue using at your own risk
        break;
      }
      default: {
        desc = createFragment((fragment) => {
          fragment.appendText(`⚠️ ${PLUGIN_NAME} requires the `);
          fragment.createEl('a', {
            href: 'https://github.com/Vinzent03/obsidian-git',
            text: 'Obsidian Git'
          });
          fragment.appendText(' plugin to be installed and enabled.');
        });
      }
    }
    if (state !== GitPluginState.Enabled) {
      setting = this.createSetting()
        .setName(desc)
        .setClass('git-changelog-warning');

      if (state === GitPluginState.Uninitialized) {
        setting.addButton((button) => {
          button.setButtonText('Install');
          button.onClick(() => {
            window.open('obsidian://show-plugin?id=obsidian-git');
          });
        });
      }
    }
  }
}

export function gitPluginCompatibleVersion(plugin: ObsidianGitPlugin): boolean {
  if (
    compareVersions(
      plugin.manifest.version,
      MIN_COMPATIBLE_GIT_PLUGIN_VERSION
    ) < 0
  ) {
    return false;
  }
  return true;
}

export function gitPluginTestedVersion(plugin: ObsidianGitPlugin): boolean {
  if (
    compareVersions(plugin.manifest.version, MAX_TESTED_GIT_PLUGIN_VERSION) > 0
  ) {
    return false;
  }
  return true;
}
