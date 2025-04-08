import type GitChangelogPlugin from 'main.ts';
import type { GitChangelogSettingsTab } from 'settings/settingsTab.ts';

import { SettingEx } from 'obsidian-dev-utils/obsidian/SettingEx';

export abstract class SettingComponent {
  protected containerEl: HTMLElement;
  protected disabled: boolean;
  protected plugin: GitChangelogPlugin;
  protected settingTab: GitChangelogSettingsTab;

  public constructor({
    disabled = false,
    plugin
  }: {
    disabled?: boolean;
    plugin: GitChangelogPlugin;
  }) {
    this.plugin = plugin;
    this.disabled = disabled;
    this.settingTab = this.plugin.settingsTab;
    this.containerEl = this.settingTab.containerEl;
  }

  public abstract display(): void;

  protected createSetting(): SettingEx {
    const setting = new SettingEx(this.containerEl);
    if (this.disabled) {
      setting.setDisabled(true);
      setting.setClass('git-changelog-disabled');
    }
    return setting;
  }

  /**
   * Delays the update of the settings UI.
   * Used when the user toggles one of the settings that control enabled states of other settings. Delaying the update
   * allows most of the toggle animation to run, instead of abruptly jumping between enabled/disabled states.
   */
  protected refreshDisplayWithDelay(timeout = 80): void {
    if (this.settingTab) {
      setTimeout(() => {
        this.settingTab?.display();
      }, timeout);
    }
  }
}
