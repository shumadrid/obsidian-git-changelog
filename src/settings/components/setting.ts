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
   * Delays the update of the settings UI.
   * Used when the user toggles one of the settings that control enabled states of other settings. Delaying the update
   * allows most of the toggle animation to run, instead of abruptly jumping between enabled/disabled states.
   */
  protected refreshDisplayWithDelay(timeout = 80): void {
    if (this.settingTab) {
      setTimeout(() => this.settingTab?.display(), timeout);
    }
  }

  /**
   * Sets the value in the textbox for a given setting only if the saved value differs from the default value.
   * If the saved value is the default value, it probably wasn't defined by the user, so it's better to display it as a placeholder.
   */
  protected setNonDefaultValue({
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
