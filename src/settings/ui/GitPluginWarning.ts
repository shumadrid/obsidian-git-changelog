import type { ObsidianGitPlugin } from 'gitPluginTypes.ts';
import type { Setting } from 'obsidian';

import { compareVersions } from 'compare-versions';
import {
  MAX_TESTED_GIT_PLUGIN_VERSION,
  MIN_COMPATIBLE_GIT_PLUGIN_VERSION
} from 'constants.ts';
import { SettingComponent } from 'settings/components/setting.ts';
import { GitPluginState } from 'types.ts';

export class GitPluginWarning extends SettingComponent {
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
        desc = `⚠️ The installed Git plugin version is incompatible. Oldest compatible version is ${
          MIN_COMPATIBLE_GIT_PLUGIN_VERSION
        }`;
        break;
      }
      case GitPluginState.UntestedVersion: {
        desc = `Compatibility with the installed Git plugin version is not tested. Latest tested version is ${
          MAX_TESTED_GIT_PLUGIN_VERSION
        }`;
        // A button to continue using at your own risk
        break;
      }
      default: {
        desc = createFragment((fragment) => {
          fragment.appendText(`⚠️ This plugin requires the `);
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
