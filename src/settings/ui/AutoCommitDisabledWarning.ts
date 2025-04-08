import type { GitChangelogSettings } from 'settings/settings.ts';

import { SettingComponent } from 'settings/components/setting.ts';

export class AutoCommitDisabledWarning extends SettingComponent {
  public display(): void {
    try {
      const gitPlugin = this.plugin.getGitPlugin();
      if (
        !this.plugin.settings.autoCommitDisabledWarningDismissed &&
        gitPlugin.settings.autoSaveInterval <= 0
      ) {
        const warningSetting = this.createSetting()
          .setName('⚠️ Auto-commit setting not enabled')
          .setDesc(
            "It's recommended to enable this setting in Git plugin's settings."
          )
          .setClass('git-changelog-warning')
          .addButton((button) => {
            button.setButtonText('Dismiss');
            button.onClick(() => {
              warningSetting.settingEl.remove();

              // eslint-disable-next-line @typescript-eslint/no-floating-promises
              this.plugin.settingsManager.editAndSave(
                (settings: GitChangelogSettings): void => {
                  settings.autoCommitDisabledWarningDismissed = true;
                }
              );
            });
          });
      }
    } catch {
      /* Empty */
    }
  }
}
