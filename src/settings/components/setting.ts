import type GitChangelogPlugin from 'main.ts';
import type { TextComponent } from 'obsidian';
import type {
  ChangelogGenerationSettings,
  IGitChangelogSettings
} from 'settings/settings.ts';
import type { GitChangelogSettingsTab } from 'settings/settingsTab.ts';

import { moment } from 'obsidian';
import { NumberComponent } from 'obsidian-dev-utils/obsidian/Components/NumberComponent';
import { TimeComponent } from 'obsidian-dev-utils/obsidian/Components/TimeComponent';
import { SettingEx } from 'obsidian-dev-utils/obsidian/SettingEx';
import { DEFAULT_SETTINGS } from 'settings/settings.ts';

export abstract class GitChangelogSetting {
  protected containerEl: HTMLElement;
  protected disabled: boolean;
  protected plugin: GitChangelogPlugin;
  protected settingTab?: GitChangelogSettingsTab;

  public constructor({
    containerEl,
    disabled = false,
    plugin,
    settingTab
  }: {
    containerEl: HTMLElement;
    disabled?: boolean;
    plugin: GitChangelogPlugin;
    settingTab?: GitChangelogSettingsTab;
  }) {
    this.plugin = plugin;
    this.containerEl = containerEl;
    this.disabled = disabled;
    this.settingTab = settingTab;
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
   * It delays the update of the associated ui state of the conditional setting enabled or disabled state, so that the toggle animation can end its animation smoother.
   */
  // eslint-disable-next-line no-magic-numbers
  protected refreshDisplaySmooth(timeout = 80): void {
    if (this.settingTab) {
      setTimeout(() => this.settingTab?.display(), timeout);
    }
  }

  protected setValueIfNonDefaultSetting({
    diffSettingsProperty,
    settingsProperty,
    text
  }: {
    diffSettingsProperty?: keyof ChangelogGenerationSettings;
    settingsProperty: keyof IGitChangelogSettings;
    text: NumberComponent | TextComponent | TimeComponent;
  }): void {
    const storedValue = diffSettingsProperty
      ? (this.plugin.settings[settingsProperty] as ChangelogGenerationSettings)[
          diffSettingsProperty
        ]
      : this.plugin.settings[settingsProperty];
    const defaultValue = diffSettingsProperty
      ? (DEFAULT_SETTINGS[settingsProperty] as ChangelogGenerationSettings)[
          diffSettingsProperty
        ]
      : DEFAULT_SETTINGS[settingsProperty];

    if (defaultValue !== storedValue) {
      if (text instanceof NumberComponent) {
        text.setValue(Number(storedValue));
      } else if (text instanceof TimeComponent) {
        text.setValue(moment.duration({ hours: Number(storedValue) }));
      } else {
        text.setValue(
          typeof storedValue === 'object'
            ? JSON.stringify(storedValue)
            : String(storedValue)
        );
      }
    }
  }
}
